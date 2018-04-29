import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable} from 'rxjs';
import {map, mergeMap, skip, take} from 'rxjs/operators';
import {IContactListItem, User} from '../account';
import {StringProto} from '../proto';
import {filterDuplicatesOperator, filterUndefined} from '../util/filter';
import {cacheObservable} from '../util/flatten-observable';
import {normalize} from '../util/formatting';
import {getOrSetDefault, getOrSetDefaultAsync} from '../util/get-or-set-default';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';


/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** @ignore */
	private readonly contactIdCache: Map<string, Map<string, string>>	=
		new Map<string, Map<string, string>>()
	;

	/** List of contacts for current user, sorted alphabetically by username. */
	public readonly contactList: Observable<(IContactListItem|User)[]>	= cacheObservable(
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
					map(({username}) => username).
					sort()
			),
			filterDuplicatesOperator(),
			map(usernames => usernames.map(username => ({
				user: this.accountUserLookupService.getUser(username),
				username
			})))
		),
		[]
	);

	/** Fully loads contact list. */
	public readonly fullyLoadContactList	= memoize(
		(contactList: Observable<(IContactListItem|User)[]>) : Observable<User[]> =>
			cacheObservable(
				contactList.pipe(mergeMap(async contacts =>
					filterUndefined(await Promise.all(
						contacts.map(async contact =>
							contact instanceof User ? contact : contact.user
						)
					))
				)),
				[]
			)
	);

	/** Indicates whether spinner should be displayed. */
	public readonly showSpinner: BehaviorSubject<boolean>	= new BehaviorSubject(true);

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
		private readonly potassiumService: PotassiumService
	) {
		this.accountDatabaseService.getListKeys('contactUsernames').then(keys => {
			if (keys.length < 1) {
				this.showSpinner.next(false);
			}
		});

		this.contactList.pipe(skip(2), take(1)).toPromise().then(() => {
			this.showSpinner.next(false);
		});
	}
}
