import {Injectable} from '@angular/core';
import {userPresence} from '../account/enums';
import {IUser} from '../account/iuser';
import {util} from '../util';
import {AccountAuthService} from './account-auth.service';


/**
 * @see Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** @ignore */
	private static DUMMY_CONTACTS: IUser[]	= [

	].map((user: {avatar?: string; name: string; username: string}) => ({
		avatar: user.avatar || '/img/logo.purple.icon.png',
		name: user.name,
		status: userPresence[util.random(userPresence.length)],
		username: user.username
	}));

	/** List of contacts for current user. */
	public get contacts () : IUser[] {
		if (!this.accountAuthService) {
			return [];
		}

		return AccountContactsService.DUMMY_CONTACTS.sort((a, b) => {
			const statusIndexA	= userPresence.indexOf(a.status);
			const statusIndexB	= userPresence.indexOf(b.status);

			return (
				statusIndexA !== statusIndexB ?
					statusIndexA < statusIndexB :
					a.name !== b.name ?
						a.name < b.name :
						a.username < b.username
			) ?
				-1 :
				1
			;
		});
	}

	constructor (
		/** @ignore */
		private accountAuthService: AccountAuthService
	) {}
}
