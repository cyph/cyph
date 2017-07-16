import {Injectable} from '@angular/core';
import {AccountUserPresence, AccountUserProfile} from '../../proto';
import {User} from '../account/user';
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
				true,
				true
			).map(
				({value}) => value
			),
			this.accountDatabaseService.watch(
				`${url}/coverImage`,
				DataURIProto,
				true,
				true
			).map(
				({value}) => value
			),
			this.databaseService.getAsyncValue(
				`${url}/presence`,
				AccountUserPresence
			),
			this.accountDatabaseService.getAsyncValue(
				`${url}/publicProfile`,
				AccountUserProfile,
				true,
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
