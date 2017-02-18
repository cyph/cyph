import {Injectable} from '@angular/core';
import {UserPresence, userPresence} from '../account/enums';
import {IUser} from '../account/iuser';
import {util} from '../util';
import {AccountAuthService} from './account-auth.service';


/**
 * @see Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** @ignore */
	public static DUMMY_CONTACTS: IUser[]	= [

	].map((user: {avatar: string; name: string; username: string}) => ({
		avatar: user.avatar,
		name: user.name,
		status: userPresence[util.random(userPresence.length)],
		username: user.username
	}));

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** List of contacts for current user. */
	public get contacts () : IUser[] {
		if (!this.accountAuthService.authenticated) {
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
