import {Injectable} from '@angular/core';
import {AccountUserProfile, IAccountUserProfile} from '../../proto';
import {User} from '../account/user';
import {AccountDatabaseService} from './crypto/account-database.service';


/**
 * Account user lookup service.
 */
@Injectable()
export class AccountUserLookupService {
	/** Tries to to get user object for the specified username. */
	public async getUser (username: string) : Promise<User> {
		return new User(
			await this.accountDatabaseService.getItemObject<IAccountUserProfile>(
				`users/${username.toLowerCase()}/publicProfile`,
				AccountUserProfile,
				true
			)
		);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {}
}
