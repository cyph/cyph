import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {AccountContactRecord, IAccountContactRecord} from '../../proto';
import {UserPresence, userPresenceSorted} from '../account/enums';
import {User} from '../account/user';
import {util} from '../util';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';


/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** @ignore */
	private readonly contactsListSubject: BehaviorSubject<User[]>	=
		new BehaviorSubject<User[]>([])
	;

	/** @ignore */
	private userStatuses: Map<User, UserPresence>		= new Map<User, UserPresence>();

	/** List of contacts for current user, sorted by status and then alphabetically. */
	public readonly contactsList: Observable<User[]>	= this.contactsListSubject;

	/** @ignore */
	private updateContactsList () : void {
		const users	= Array.from(this.userStatuses.keys());

		this.contactsListSubject.next(users.sort((a, b) => {
			const statusIndexA	= userPresenceSorted.indexOf(
				util.getOrSetDefault(this.userStatuses, a, () => UserPresence.Offline)
			);

			const statusIndexB	= userPresenceSorted.indexOf(
				util.getOrSetDefault(this.userStatuses, b, () => UserPresence.Offline)
			);

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
		}));
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {
		this.accountDatabaseService.watchList<IAccountContactRecord>(
			'contactRecords',
			AccountContactRecord
		).subscribe(async records => {
			const users	= <User[]> (await Promise.all(records.map(async ({value}) =>
				this.accountUserLookupService.getUser(value.username).catch(() => undefined)
			))).filter(user =>
				user !== undefined
			);

			const oldUserStatuses	= this.userStatuses;
			this.userStatuses		= new Map<User, UserPresence>();

			for (const user of users) {
				const oldUserStatus	= oldUserStatuses.get(user);
				if (oldUserStatus !== undefined) {
					this.userStatuses.set(user, oldUserStatus);
					continue;
				}

				this.userStatuses.set(user, UserPresence.Offline);
				user.status.subscribe(status => {
					this.userStatuses.set(user, status);
					this.updateContactsList();
				});
			}

			return users;
		});
	}
}
