import {Injectable} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {userPresenceSorted} from '../account/enums';
import {User} from '../account/user';
import {AccountAuthService} from './account-auth.service';
import {AccountDatabaseService} from './account-database.service';
import {AccountUserLookupService} from './account-user-lookup.service';


/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** List of contacts for current user. */
	public readonly contacts: Subject<User[]>	= new BehaviorSubject([]);

	/** @ignore */
	private async updateContacts () : Promise<void> {
		if (!this.accountDatabaseService.current) {
			return;
		}

		this.contacts.next((
			await Promise.all(
				(
					await this.accountDatabaseService.getItemObject<string[]>('contactList')
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
		);
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {
		this.updateContacts();
		this.accountAuthService.onLogin.subscribe(() => {
			this.updateContacts();
		});
	}
}
