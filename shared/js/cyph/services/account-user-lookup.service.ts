import {Injectable} from '@angular/core';
import {map} from 'rxjs/operators/map';
import {AccountUserPresence, AccountUserProfile} from '../../proto';
import {SecurityModels, User} from '../account';
import {DataURIProto} from '../protos';
import * as util from '../util';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';


/**
 * Account user lookup service.
 */
@Injectable()
export class AccountUserLookupService {
	/** @ignore */
	private readonly existsCache: Set<string>		= new Set<string>();

	/** @ignore */
	private readonly userCache: Map<string, User>	= new Map<string, User>();

	/**
	 * Checks to see if a username is owned by an existing user.
	 * @param confirmedOnly If true, limits check to fully registered users and fails
	 * when a user cert fails to verify. Otherwise, simply checks that the server has
	 * a record of either an account with this username or a pending registration request.
	 */
	public async exists (username: string, confirmedOnly: boolean = true) : Promise<boolean> {
		username	= util.normalize(username);
		const url	= `users/${username}`;

		const exists	= username.length > 0 && (
			this.existsCache.has(username) ||
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
		}

		return exists;
	}

	/** Tries to to get user object for the specified username. */
	public async getUser (username: string) : Promise<User> {
		username	= util.normalize(username);
		const url	= `users/${username}`;

		const user	= util.getOrSetDefault(this.userCache, username, () => new User(
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
			)
		));

		await user.accountUserProfile.getValue();

		return user;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly databaseService: DatabaseService
	) {}
}
