import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {map} from 'rxjs/operators';
import {SecurityModels, User} from '../account';
import {BaseProvider} from '../base-provider';
import {
	AccountUserPresence,
	AccountUserProfile,
	AccountUserProfileExtra,
	BooleanMapProto,
	CyphPlan,
	DataURIProto,
	NeverProto,
	Review
} from '../proto';
import {normalize} from '../util/formatting';
import {getOrSetDefaultAsync} from '../util/get-or-set-default';
import {debugLogError, debugLogTime} from '../util/log';
import {AccountContactsService} from './account-contacts.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';

/**
 * Account user lookup service.
 */
@Injectable()
export class AccountUserLookupService extends BaseProvider {
	/** @ignore */
	private readonly existsCache: Set<string> = new Set<string>();

	/** @ignore */
	private readonly existsConfirmedCache: Set<string> = new Set<string>();

	/** @ignore */
	private readonly userCache: Map<string, User> = new Map<string, User>();

	/** Gets count of unread messages from a user. */
	public readonly getUnreadMessageCount = memoize(username =>
		this.accountDatabaseService
			.getAsyncMap(
				`unreadMessages/${normalize(username)}`,
				NeverProto,
				SecurityModels.unprotected
			)
			.watchSize()
	);

	/** Checks to see if a username is blacklisted. */
	public readonly usernameBlacklisted = memoize(
		async (username: string, reservedUsername?: string) =>
			!(
				reservedUsername &&
				normalize(username) === normalize(reservedUsername)
			) &&
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
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

	/*
	TODO: Re-enable when needed, but ideally redesign for better performance.

	If applicable, a whitelist of acceptable user types for this user to interact with.

	public readonly userTypeWhitelist = memoize(
		async () : Promise<AccountUserTypes[] | undefined> => {
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
	);
	*/

	/** @ignore */
	private async isDeactivated (user: string | User) : Promise<boolean> {
		const username = normalize(
			typeof user === 'string' ? user : user.username
		);

		if (
			this.accountDatabaseService.currentUser.value?.user.username ===
			username
		) {
			return false;
		}

		return this.accountDatabaseService.hasItem(
			`users/${username}/deactivated`
		);
	}

	/**
	 * Checks to see if a username is owned by an existing user.
	 * @param confirmedOnly If true, limits check to fully registered users and fails
	 * when a user cert fails to verify. Otherwise, simply checks that the server has
	 * a record of either an account with this username or a pending registration request.
	 */
	public async exists (
		username: string,
		confirmedOnly: boolean = true
	) : Promise<boolean> {
		if (!username) {
			return false;
		}

		username = normalize(username);
		const url = `users/${username}`;

		if (!username || (await this.isDeactivated(username))) {
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
					getProfile()
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
		user: string | User | undefined,
		blockUntilAlreadyCached: boolean = false,
		preFetch: boolean = false,
		skipExistsCheck: boolean = true
	) : Promise<User | undefined> {
		let logKey = 'getUser';

		const initialArgs = {
			blockUntilAlreadyCached,
			preFetch,
			skipExistsCheck,
			user
		};

		const returnUser = async (userValue?: User) => {
			let fetchPromise: Promise<void> | undefined;

			if (!blockUntilAlreadyCached && userValue) {
				fetchPromise = userValue.fetch(true);
			}

			if (preFetch && userValue) {
				debugLogTime(() => ({
					[`${logKey}_preFetch`]: {
						initialArgs,
						user: userValue,
						username: userValue.username
					}
				}));

				if (!fetchPromise) {
					fetchPromise = userValue.fetch();
				}

				await fetchPromise;
			}

			debugLogTime(() => ({
				[`${logKey}_return`]: {
					initialArgs,
					user: userValue,
					username: userValue?.username
				}
			}));

			return userValue;
		};

		if (!user) {
			return;
		}
		if (user instanceof User) {
			return returnUser(user);
		}

		const username = normalize(user);

		logKey += `_${username}`;

		user = this.userCache.get(username);

		debugLogTime(() => ({
			[`${logKey}_start`]: {
				initialArgs,
				preExistingInMemoryCache: user,
				username
			}
		}));

		if (user instanceof User) {
			return returnUser(user);
		}

		const url = `users/${username}`;

		const isCached = memoize(async () =>
			this.accountDatabaseService.isCached(`${url}/publicProfile`)
		);

		if (blockUntilAlreadyCached && (await isCached())) {
			blockUntilAlreadyCached = false;
		}

		debugLogTime(async () => ({
			[`${logKey}_localStorageCache`]: {
				initialArgs,
				isCached: await isCached(),
				username
			}
		}));

		user = await getOrSetDefaultAsync(
			this.userCache,
			username,
			async () => {
				debugLogTime(async () => ({
					[`${logKey}_downloadFromServer`]: {
						initialArgs,
						isCached: await isCached(),
						username
					}
				}));

				if (
					(!skipExistsCheck && !(await this.exists(username))) ||
					(await this.isDeactivated(username))
				) {
					throw new Error('User does not exist.');
				}

				const userValue = new User(
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
								/* eslint-disable-next-line @typescript-eslint/tslint/config */
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
								/* eslint-disable-next-line @typescript-eslint/tslint/config */
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
					this.databaseService.getAsyncValue(`${url}/plan`, CyphPlan),
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
					this.getUnreadMessageCount(username)
				);

				debugLogTime(async () => ({
					[`${logKey}_objectInitComplete`]: {
						initialArgs,
						user: userValue,
						username
					}
				}));

				/*
				const userTypeWhitelist = await this.userTypeWhitelist();

				if (
					userTypeWhitelist !== undefined &&
					userTypeWhitelist.indexOf(
						(await userValue.accountUserProfile.getValue()).userType
					) < 0
				) {
					return;
				}
				*/

				return userValue;
			},
			undefined,
			blockUntilAlreadyCached
		).catch(err => {
			debugLogError(() => ({getUserError: err}));
			return undefined;
		});

		return returnUser(user);
	}

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly databaseService: DatabaseService
	) {
		super();

		this.accountContactsService.accountUserLookupService.next(this);
	}
}
