import {Injectable} from '@angular/core';
import {map} from 'rxjs/operators/map';
import {profileExtraTemp, SecurityModels, User} from '../account';
import {
	AccountUserPresence,
	AccountUserProfile,
	// AccountUserProfileExtra,
	DataURIProto
} from '../proto';
import {normalize} from '../util/formatting';
import {getOrSetDefaultAsync} from '../util/get-or-set-default';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';


/**
 * Account user lookup service.
 */
@Injectable()
export class AccountUserLookupService {
	/** @ignore */
	private readonly existsCache: Set<string>			= new Set<string>();

	/** @ignore */
	private readonly existsConfirmedCache: Set<string>	= new Set<string>();

	/** @ignore */
	private readonly userCache: Map<string, User>		= new Map<string, User>();

	/**
	 * Checks to see if a username is owned by an existing user.
	 * @param confirmedOnly If true, limits check to fully registered users and fails
	 * when a user cert fails to verify. Otherwise, simply checks that the server has
	 * a record of either an account with this username or a pending registration request.
	 */
	public async exists (username: string, confirmedOnly: boolean = true) : Promise<boolean> {
		if (!username) {
			return false;
		}

		username	= normalize(username);
		const url	= `users/${username}`;

		if (!username) {
			return false;
		}

		const exists	= username.length > 0 && (
			(confirmedOnly ? this.existsConfirmedCache : this.existsCache).has(username) ||
			this.userCache.has(username) ||
			await (confirmedOnly ?
				this.accountDatabaseService.getItem(
					`${url}/publicProfile`,
					AccountUserProfile,
					SecurityModels.public,
					undefined,
					true
				).then(
					() => true
				).catch(
					() => false
				) :
				this.accountDatabaseService.hasItem(`${url}/publicProfile`)
			)
		);

		if (exists) {
			this.existsCache.add(username);

			if (confirmedOnly) {
				this.existsConfirmedCache.add(username);
			}
		}

		return exists;
	}

	/** Tries to to get user object for the specified username. */
	public async getUser (username: string) : Promise<User|undefined> {
		if (!username) {
			return;
		}

		username	= normalize(username);
		const url	= `users/${username}`;

		return getOrSetDefaultAsync(this.userCache, username, async () => {
			if (!(await this.exists(username))) {
				throw new Error('User does not exist.');
			}

			return new User(
				username,
				this.accountDatabaseService.watch(
					`${url}/avatar`,
					DataURIProto,
					SecurityModels.public,
					undefined,
					true
				).pipe(map(({value}) =>
					/* tslint:disable-next-line:strict-type-predicates */
					typeof value === 'string' || Object.keys(value).length > 0 ? value : undefined
				)),
				this.accountDatabaseService.watch(
					`${url}/coverImage`,
					DataURIProto,
					SecurityModels.public,
					undefined,
					true
				).pipe(map(({value}) =>
					/* tslint:disable-next-line:strict-type-predicates */
					typeof value === 'string' || Object.keys(value).length > 0 ? value : undefined
				)),
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
				profileExtraTemp
				/*
				this.accountDatabaseService.getAsyncValue(
					`${url}/publicProfileExtra`,
					AccountUserProfileExtra,
					SecurityModels.public,
					undefined,
					true
				)
				*/
			);
		}).catch(
			() => undefined
		);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly databaseService: DatabaseService
	) {}
}
