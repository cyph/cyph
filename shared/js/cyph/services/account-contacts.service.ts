import {Injectable} from '@angular/core';
import {userPresenceSorted} from '../account/enums';
import {IUser} from '../account/iuser';
import {AccountAuthService} from './account-auth.service';
import {AccountUserLookupService} from './account-user-lookup.service';


/**
 * @see Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** List of contacts for current user. */
	public get contacts () : IUser[] {
		if (!this.accountAuthService.user) {
			return [];
		}

		return AccountUserLookupService.DUMMY_USERS.
			filter(user =>
				this.accountAuthService.user &&
				user.username !== this.accountAuthService.user.username
			).
			sort((a, b) => {
				const statusIndexA	= userPresenceSorted.indexOf(a.status);
				const statusIndexB	= userPresenceSorted.indexOf(b.status);

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
			})
		;
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService
	) {}
}
