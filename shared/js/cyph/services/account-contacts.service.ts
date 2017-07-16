import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {AccountContactRecord} from '../../proto';
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
	private userStatuses: Map<User, UserPresence>			= new Map<User, UserPresence>();

	/** List of contacts for current user, sorted by status and then alphabetically by username. */
	public readonly contactsList: Observable<User[]>		= this.contactsListSubject;

	public readonly contactUsernames: Observable<string[]>	= util.flattenObservablePromise(
		this.accountDatabaseService.watchList(
			'contactRecords',
			AccountContactRecord
		).map(
			contacts => contacts.map(o => o.value.username)
		)
	);

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
		this.contactUsernames.subscribe(async usernames => {
			const oldUserStatuses	= this.userStatuses;
			this.userStatuses		= new Map<User, UserPresence>();

			for (const username of usernames) {
				try {
					const user	= await this.accountUserLookupService.getUser(username);

					const oldUserStatus	= oldUserStatuses.get(user);
					if (oldUserStatus !== undefined) {
						this.userStatuses.set(user, oldUserStatus);
						continue;
					}

					this.userStatuses.set(user, await user.status.take(1).toPromise());
					user.status.skip(1).subscribe(async status => {
						this.userStatuses.set(user, status);
						this.updateContactsList();
					});
				}
				catch (_) {}
				finally {
					this.updateContactsList();
				}
			}
		});
	}
}
