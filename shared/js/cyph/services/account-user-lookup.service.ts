import {Injectable} from '@angular/core';
import {memoize} from 'lodash-es';
import {map} from 'rxjs/operators';
import {SecurityModels, User} from '../account';
import {BaseProvider} from '../base-provider';
import {LockFunction} from '../lock-function-type';
import {
	AccountUserPresence,
	AccountUserProfile,
	AccountUserProfileExtra,
	AccountUserTypes,
	BooleanMapProto,
	DataURIProto,
	NeverProto,
	Review
} from '../proto';
import {normalize} from '../util/formatting';
import {getOrSetDefaultAsync} from '../util/get-or-set-default';
import {lockFunction} from '../util/lock';
import {AccountContactsService} from './account-contacts.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';
import {EnvService} from './env.service';

/**
 * Account user lookup service.
 */
@Injectable()
export class AccountUserLookupService extends BaseProvider {
	/** @ignore */
	private readonly downloadLock: LockFunction = lockFunction();

	/** @ignore */
	private readonly existsCache: Set<string> = new Set<string>();

	/** @ignore */
	private readonly existsConfirmedCache: Set<string> = new Set<string>();

	/** @ignore */
	private readonly userCache: Map<string, User> = new Map<string, User>();

	/** Checks to see if a username is blacklisted. */
	public readonly usernameBlacklisted = memoize(
		async (username: string, reservedUsername?: string) =>
			!(
				reservedUsername &&
				normalize(username) === normalize(reservedUsername)
			) &&
			/* tslint:disable-next-line:no-promise-as-boolean */
			this.databaseService
				.callFunction('usernameBlacklisted', {username})
				.then(
					(o: any) =>
						typeof o === 'object' && o.isBlacklisted === true
				)
				.catch(() => true),
		(username: string, reservedUsername?: string) =>
			typeof reservedUsername === 'string' ?
				`${username}\n${reservedUsername}` :
				username
	);

	/**
	 * Checks to see if a username is owned by an existing user.
	 * @param confirmedOnly If true, limits check to fully registered users and fails
	 * when a user cert fails to verify. Otherwise, simply checks that the server has
	 * a record of either an account with this username or a pending registration request.
	 */
	public async exists (
		username: string,
		lock: boolean = true,
		confirmedOnly: boolean = true
	) : Promise<boolean> {
		if (!username) {
			return false;
		}

		username = normalize(username);
		const url = `users/${username}`;

		if (!username) {
			return false;
		}

		const getProfile = async () =>
			this.accountDatabaseService.getItem(
				`${url}/publicProfile`,
				AccountUserProfile,
				SecurityModels.public,
				undefined,
				true
			);

		const exists =
			username.length > 0 &&
			((confirmedOnly ? this.existsConfirmedCache : this.existsCache).has(
				username
			) ||
				this.userCache.has(username) ||
				(await (confirmedOnly ?
					(lock ? this.downloadLock(getProfile) : getProfile())
						.then(() => true)
						.catch(() => false) :
					this.accountDatabaseService.hasItem(
						`${url}/publicProfile`
					))));

		if (exists) {
			this.existsCache.add(username);

			if (confirmedOnly) {
				this.existsConfirmedCache.add(username);
			}
		}

		return exists;
	}

	/** Tries to to get User object for the specified user. */
	public async getUser (
		user: string | User,
		lock: boolean = true,
		preFetch: boolean = false,
		skipExistsCheck: boolean = false
	) : Promise<User | undefined> {
		const userValue = await (async () => {
			if (!user) {
				return;
			}
			if (user instanceof User) {
				return user;
			}

			const username = normalize(user);
			const url = `users/${username}`;

			return getOrSetDefaultAsync(
				this.userCache,
				username,
				async () => {
					/* Temporary workaround for migrating users to latest Potassium.Box */

					if (
						!skipExistsCheck &&
						!(await this.exists(username, lock, true))
					) {
						throw new Error('User does not exist.');
					}

					return new User(
						username,
						this.accountContactsService.getContactID(username),
						this.accountDatabaseService
							.watch(
								`${url}/avatar`,
								DataURIProto,
								SecurityModels.public,
								undefined,
								true
							)
							.pipe(
								map(({value}) =>
									/* tslint:disable-next-line:strict-type-predicates */
									typeof value === 'string' ||
									Object.keys(value).length > 0 ?
										value :
										undefined
								)
							),
						this.accountDatabaseService
							.watch(
								`${url}/coverImage`,
								DataURIProto,
								SecurityModels.public,
								undefined,
								true
							)
							.pipe(
								map(({value}) =>
									/* tslint:disable-next-line:strict-type-predicates */
									typeof value === 'string' ||
									Object.keys(value).length > 0 ?
										value :
										undefined
								)
							),
						this.accountContactsService.contactState(username),
						this.databaseService.getAsyncValue(
							`${url}/presence`,
							AccountUserPresence
						),
						this.accountDatabaseService.getAsyncValue(
							`${url}/publicProfile`,
							AccountUserProfile,
							SecurityModels.public,
							undefined,
							true
						),
						this.accountDatabaseService.getAsyncValue(
							`${url}/publicProfileExtra`,
							AccountUserProfileExtra,
							SecurityModels.public,
							undefined,
							true
						),
						this.accountDatabaseService.getAsyncValue(
							`${url}/organizationMembers`,
							BooleanMapProto,
							SecurityModels.public,
							undefined,
							true
						),
						this.accountDatabaseService.getAsyncMap(
							`${url}/reviews`,
							Review,
							SecurityModels.publicFromOtherUsers,
							undefined,
							true
						),
						(async () =>
							this.accountDatabaseService.getAsyncMap(
								`unreadMessages/${
									(await this.accountContactsService.getCastleSessionData(
										username
									)).castleSessionID
								}`,
								NeverProto,
								SecurityModels.unprotected
							))(),
						preFetch
					);
				},
				lock
			).catch(() => undefined);
		})();

		if (!userValue) {
			return;
		}

		const userTypeWhitelist = await this.userTypeWhitelist();

		if (
			userTypeWhitelist !== undefined &&
			userTypeWhitelist.indexOf(
				(await userValue.accountUserProfile.getValue()).userType
			) < 0
		) {
			return;
		}

		return userValue;
	}

	/** If applicable, a whitelist of acceptable user types for this user to interact with. */
	public async userTypeWhitelist () : Promise<
		AccountUserTypes[] | undefined
	> {
		if (!this.envService.isTelehealth) {
			return [AccountUserTypes.Org, AccountUserTypes.Standard];
		}

		if (!this.accountDatabaseService.currentUser.value) {
			return;
		}

		const {
			userType
		} = await this.accountDatabaseService.currentUser.value.user.accountUserProfile.getValue();

		if (userType !== AccountUserTypes.Standard) {
			return;
		}

		return [
			AccountUserTypes.Org,
			AccountUserTypes.TelehealthAdmin,
			AccountUserTypes.TelehealthDoctor
		];
	}

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		super();

		this.accountContactsService.init(this);
	}
}
