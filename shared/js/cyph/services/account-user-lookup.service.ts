import {Injectable} from '@angular/core';
import {AccountUserPresence, AccountUserProfile} from '../../proto';
import {SecurityModels, User} from '../account';
import {DataURIProto} from '../protos';
import {util} from '../util';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';


/**
 * Account user lookup service.
 */
@Injectable()
export class AccountUserLookupService {
	/** @ignore */
	private readonly userCache: Map<string, User>	= new Map<string, User>();

	/** Tries to to get user object for the specified username. */
	public async getUser (username: string) : Promise<User> {
		username	= username.toLowerCase();
		const url	= `users/${username}`;

		const user	= util.getOrSetDefault(this.userCache, username, () => new User(
			username,
			this.accountDatabaseService.watch(
				`${url}/avatar`,
				DataURIProto,
				SecurityModels.public,
				undefined,
				true
			).map(({value}) =>
				typeof value === 'string' || Object.keys(value).length > 0 ? value : undefined
			),
			this.accountDatabaseService.watch(
				`${url}/coverImage`,
				DataURIProto,
				SecurityModels.public,
				undefined,
				true
			).map(({value}) =>
				typeof value === 'string' || Object.keys(value).length > 0 ? value : undefined
			),
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
