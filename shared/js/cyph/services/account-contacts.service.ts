import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {AccountContactRecord, AccountUserPresence} from '../../proto';
import {UserPresence, userPresenceSorted} from '../account/enums';
import {User} from '../account/user';
import {util} from '../util';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';


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

	/** List of usernames of contacts for current user. */
	public readonly contactUsernames: Observable<string[]>	= util.flattenObservablePromise(
		this.accountDatabaseService.watchList(
			'contactRecords',
			AccountContactRecord
		).map(
			contacts => contacts.map(o => o.value.username)
		)
	);

	/** Indicates whether the first load of the contacts list has completed. */
	public initiated: boolean	= false;

	/** @ignore */
	private sort<T> (users: (T&{status: AccountUserPresence.Statuses; username: string})[]) : T[] {
		return users.sort((a, b) => {
			const statusIndexA	= userPresenceSorted.indexOf(a.status);
			const statusIndexB	= userPresenceSorted.indexOf(b.status);

			return (
				statusIndexA !== statusIndexB ?
					statusIndexA < statusIndexB :
					a.username < b.username
			) ?
				-1 :
				1
			;
		});
	}

	/** @ignore */
	private updateContactsList () : void {
		this.contactsListSubject.next(
			this.sort(
				Array.from(this.userStatuses.keys()).map(user => ({
					status: util.getOrSetDefault(
						this.userStatuses,
						user,
						() => UserPresence.Offline
					),
					user,
					username: user.username
				}))
			).map(
				({user}) => user
			)
		);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly databaseService: DatabaseService
	) {
		const lock	= util.lockFunction();

		this.contactUsernames.flatMap(async usernames => Promise.all(
			usernames.map(async username => ({
				status: (
					await this.databaseService.getItem(
						`users/${username}/presence`,
						AccountUserPresence
					).catch(
						() => ({status: AccountUserPresence.Statuses.Offline})
					)
				).status,
				username
			})
		))).subscribe(async users => {
			const oldUserStatuses	= this.userStatuses;
			this.userStatuses		= new Map<User, UserPresence>();

			for (const {status, username} of this.sort(users)) {
				try {
					const user	= await this.accountUserLookupService.getUser(username);

					await lock(async () => {
						const oldUserStatus	= oldUserStatuses.get(user);
						if (oldUserStatus !== undefined) {
							this.userStatuses.set(user, oldUserStatus);
							return;
						}

						await user.avatar.filter(o => o !== undefined).take(1).toPromise();

						this.userStatuses.set(user, status);
						user.status.skip(1).subscribe(async newStatus => {
							this.userStatuses.set(user, newStatus);
							this.updateContactsList();
						});
					});
				}
				catch (_) {}
				finally {
					this.updateContactsList();
				}
			}

			this.initiated	= true;
		});
	}
}
