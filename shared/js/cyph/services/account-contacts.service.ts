import {Injectable} from '@angular/core';
import {userPresenceSorted} from '../account/enums';
import {User} from '../account/user';
import {AccountDatabaseService} from './account-database.service';
import {AccountUserLookupService} from './account-user-lookup.service';


/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** List of contacts for current user. */
	public async getContacts () : Promise<User[]> {
		if (!this.accountDatabaseService.current) {
			return [];
		}

		return (
			await Promise.all(
				(
					await this.accountDatabaseService.getItemObject<string[]>(
						'contactList',
						false,
						true
					)
				).map(
					async username => this.accountUserLookupService.getUser(username)
				)
			)
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
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {}
}
