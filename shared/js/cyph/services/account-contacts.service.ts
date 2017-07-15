import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {AccountContactRecord, IAccountContactRecord} from '../../proto';
import {userPresenceSorted} from '../account/enums';
import {User} from '../account/user';
import {util} from '../util';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';


/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** List of contacts for current user, sorted by status and then alphabetically. */
	public readonly contactsList: Observable<User[]>	= util.flattenObservablePromise(
		this.accountDatabaseService.watchList<IAccountContactRecord>(
			'contactRecords',
			AccountContactRecord
		).flatMap(async records =>
			(<User[]> (
				await Promise.all(records.map(async ({value}) =>
					this.accountUserLookupService.getUser(value.username).catch(() => undefined)
				))
			).filter(user =>
				user !== undefined
			)).sort((a, b) => {
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
		),
		[]
	);

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {}
}
