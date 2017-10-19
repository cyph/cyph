import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {AccountContactRecord, AccountUserPresence, IAccountContactRecord} from '../../proto';
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
	private readonly contactListSubject: BehaviorSubject<User[]>			=
		new BehaviorSubject<User[]>([])
	;

	/** @ignore */
	private readonly contactRecordMappings									= {
		id: new Map<string, IAccountContactRecord>(),
		username: new Map<string, IAccountContactRecord>()
	};

	/** @ignore */
	private readonly contactRecords: Observable<IAccountContactRecord[]>	=
		util.flattenObservablePromise(
			this.accountDatabaseService.watchList(
				'contactRecords',
				AccountContactRecord
			).map(
				contacts => contacts.map(o => o.value)
			)
		)
	;

	/** @ignore */
	private userStatuses: Map<User, UserPresence>			= new Map<User, UserPresence>();

	/** List of contacts for current user, sorted by status and then alphabetically by username. */
	public readonly contactList: Observable<User[]>			= this.contactListSubject;

	/** List of usernames of contacts for current user. */
	public readonly contactUsernames: Observable<string[]>	= this.contactRecords.map(
		contactRecords => contactRecords.map(o => o.username)
	);

	/** Indicates whether the first load has completed. */
	public initiated: boolean	= false;

	/** Indicates whether spinner should be displayed. */
	public showSpinner: boolean	= true;

	/** @ignore */
	private async getContactRecord (
		{id, username}: {id?: string; username?: string}
	) : Promise<IAccountContactRecord> {
		const contactRecord	=
			id !== undefined ?
				this.contactRecordMappings.id.get(id) :
				username !== undefined ?
					this.contactRecordMappings.username.get(util.normalize(username)) :
					undefined
		;

		if (!contactRecord) {
			if (this.initiated) {
				throw new Error('Contact not found.');
			}
			else {
				await util.sleep();
				return this.getContactRecord({id, username});
			}
		}

		return contactRecord;
	}

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
		this.contactListSubject.next(
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

	/** Gets contact ID based on username. */
	public async getContactID (username: string) : Promise<string> {
		return (await this.getContactRecord({username})).id;
	}

	/** Gets contact username based on ID. */
	public async getContactUsername (id: string) : Promise<string> {
		return (await this.getContactRecord({id})).username;
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

		this.contactRecords.subscribe(contactRecords => {
			for (const contactRecord of contactRecords) {
				this.contactRecordMappings.id.set(contactRecord.id, contactRecord);
				this.contactRecordMappings.username.set(contactRecord.username, contactRecord);
			}
		});

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
		))).skip(1).subscribe(async users => {
			const oldUserStatuses	= this.userStatuses;
			this.userStatuses		= new Map<User, UserPresence>();

			let i	= 0;
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

				if (++i > 8) {
					this.showSpinner	= false;
				}
			}

			this.initiated		= true;
			this.showSpinner	= false;
		});
	}
}
