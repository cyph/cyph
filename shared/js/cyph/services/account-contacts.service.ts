import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {skip} from 'rxjs/operators/skip';
import {take} from 'rxjs/operators/take';
import {userPresenceSorted} from '../account/enums';
import {User} from '../account/user';
import {AccountUserPresence, StringProto} from '../proto';
import {filterDuplicatesOperator, filterUndefined} from '../util/filter';
import {flattenObservablePromise} from '../util/flatten-observable-promise';
import {normalize} from '../util/formatting';
import {getOrSetDefault, getOrSetDefaultAsync} from '../util/get-or-set-default';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';


/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** @ignore */
	private readonly contactIdCache: Map<string, Map<string, string>>	=
		new Map<string, Map<string, string>>()
	;

	/** List of contacts for current user, sorted by status and then alphabetically by username. */
	public readonly contactList: Observable<User[]>;

	/** List of usernames of contacts for current user. */
	public readonly contactUsernames: Observable<string[]>	= flattenObservablePromise(
		this.accountDatabaseService.watchListKeys('contactUsernames').pipe(
			mergeMap(async keys =>
				(await Promise.all(
					(await Promise.all(
						keys.map(async key => ({
							key,
							username: await this.accountDatabaseService.getItem(
								`contactUsernames/${key}`,
								StringProto
							)
						}))
					)).map(async ({key, username}) => ({
						id: await this.getContactID(username),
						key,
						username
					}))
				)).
					filter(({id, key}) => id === key).
					map(({username}) => username)
			),
			filterDuplicatesOperator()
		),
		[]
	);

	/** Indicates whether the first load has completed. */
	public initiated: boolean	= false;

	/** Indicates whether spinner should be displayed. */
	public showSpinner: boolean	= true;

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

	/**
	 * Adds contact.
	 * @returns Contact ID.
	 */
	public async addContact (username: string) : Promise<string> {
		const id	= await this.getContactID(username);
		const url	= `contactUsernames/${id}`;

		if (!(await this.accountDatabaseService.hasItem(url))) {
			await this.accountDatabaseService.setItem(url, StringProto, normalize(username));
		}

		return id;
	}

	/** Gets contact ID based on username. */
	public async getContactID (username: string) : Promise<string> {
		const currentUserUsername	=
			(await this.accountDatabaseService.getCurrentUser()).user.username
		;

		return getOrSetDefaultAsync(
			getOrSetDefault(
				this.contactIdCache,
				currentUserUsername,
				() => new Map<string, string>()
			),
			username,
			async () => this.potassiumService.toHex(await this.potassiumService.hash.hash(
				[currentUserUsername, username].map(normalize).sort().join(' ')
			))
		);
	}

	/** Gets contact username based on ID. */
	public async getContactUsername (id: string) : Promise<string> {
		return this.accountDatabaseService.getItem(`contactUsernames/${id}`, StringProto);
	}

	/** Indicates whether the user is already a contact. */
	public async isContact (username: string) : Promise<boolean> {
		return this.accountDatabaseService.hasItem(
			`contactUsernames/${await this.getContactID(username)}`
		);
	}

	/** Removes contact. */
	public async removeContact (username: string) : Promise<void> {
		await this.accountDatabaseService.removeItem(
			`contactUsernames/${await this.getContactID(username)}`
		);
	}

	/** Adds or removes contact. */
	public async toggleContact (username: string) : Promise<void> {
		if (await this.isContact(username)) {
			await this.removeContact(username);
		}
		else {
			await this.addContact(username);
		}
	}

	/** Watches whether the user is a contact. */
	public watchIfContact (username: string) : Observable<boolean> {
		return this.accountDatabaseService.watchExists((async () =>
			`contactUsernames/${await this.getContactID(username)}`
		)());
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		this.contactList	= flattenObservablePromise(
			this.contactUsernames.pipe(mergeMap(async usernames =>
				filterUndefined(await Promise.all(
					this.sort(await Promise.all(
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
					))).
						map(async ({username}) => this.accountUserLookupService.getUser(username))
				))
			)),
			[]
		);

		this.contactList.pipe(skip(3), take(1)).toPromise().then(() => {
			this.initiated		= true;
			this.showSpinner	= false;
		});
	}
}
