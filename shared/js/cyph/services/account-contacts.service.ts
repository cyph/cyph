import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {StringArrayProto} from '../protos';
import {userPresenceSorted} from '../account/enums';
import {User} from '../account/user';
import {IAsyncValue} from '../iasync-value';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';


/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** Async value of contacts list. */
	public readonly contacts: IAsyncValue<string[]>	=
		this.accountDatabaseService.getAsyncValue('contactsList', StringArrayProto)
	;

	/** List of contacts for current user, sorted by status and then alphabetically. */
	public readonly contactsList: Observable<User[]>	=
		this.contacts.watch().flatMap(async contacts =>
			(
				await Promise.all(contacts.map(async username =>
					this.accountUserLookupService.getUser(username)
				))
			).sort((a, b) => {
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
		)
	;

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {}
}
