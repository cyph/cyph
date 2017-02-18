import {Injectable} from '@angular/core';
import {IUser} from '../account/iuser';
import {AccountContactsService} from './account-contacts.service';


/**
 * @see Account user lookup service.
 */
@Injectable()
export class AccountUserLookupService {
	/** Tries to to get user object for the specified username. */
	public async getUser (username: string) : Promise<IUser> {
		const user	= AccountContactsService.DUMMY_CONTACTS.find(o => o.username === username);

		if (user) {
			return user;
		}
		else {
			throw new Error(`User ${username} not found.`);
		}
	}

	constructor () {}
}
