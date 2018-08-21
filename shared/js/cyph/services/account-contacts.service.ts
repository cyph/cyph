import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {mergeMap, skip, take} from 'rxjs/operators';
import {IContactListItem, SecurityModels, User} from '../account';
import {BaseProvider} from '../base-provider';
import {IResolvable} from '../iresolvable';
import {AccountContactState, StringProto} from '../proto';
import {filterUndefined} from '../util/filter';
import {toBehaviorSubject} from '../util/flatten-observable';
import {normalize, normalizeArray} from '../util/formatting';
import {uuid} from '../util/uuid';
import {resolvable} from '../util/wait';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';


/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService extends BaseProvider {
	/** @ignore */
	private readonly accountUserLookupService: IResolvable<AccountUserLookupService>	=
		resolvable()
	;

	/** List of contacts for current user, sorted alphabetically by username. */
	public readonly contactList: Observable<(IContactListItem|User)[]>	= toBehaviorSubject(
		this.accountDatabaseService.watchListKeys(
			'contacts',
			this.subscriptions
		).pipe(mergeMap(async usernames => {
			const accountUserLookupService	= await this.accountUserLookupService.promise;

			return normalizeArray(usernames).map(username => {
				const user	= accountUserLookupService.getUser(username);

				return {
					unreadMessageCount: toBehaviorSubject<number>(
						user.then(async o => o ? o.unreadMessageCount : 0),
						0,
						this.subscriptions
					),
					user,
					username
				};
			});
		})),
		[],
		this.subscriptions
	);

	/** Fully loads contact list. */
	public readonly fullyLoadContactList	= memoize(
		(contactList: Observable<(IContactListItem|User)[]>) : Observable<User[]> =>
			toBehaviorSubject(
				contactList.pipe(mergeMap(async contacts =>
					filterUndefined(await Promise.all(
						contacts.map(async contact =>
							contact instanceof User ? contact : contact.user
						)
					))
				)),
				[],
				this.subscriptions
			)
	);

	/**
	 * Gets Castle session ID based on username.
	 * Note: string array parameter is temporary/deprecated.
	 */
	public readonly getCastleSessionID	= memoize(
		async (username: string|string[]) : Promise<string> => {
			const currentUserUsername	=
				(await this.accountDatabaseService.getCurrentUser()).user.username
			;

			if (username instanceof Array) {
				return this.potassiumService.toHex(await this.potassiumService.hash.hash(
					normalizeArray([currentUserUsername, ...username]).join(' ')
				));
			}

			const [userA, userB]		= normalizeArray([currentUserUsername, username]);

			if (!(userA && userB)) {
				return '';
			}

			return this.databaseService.getOrSetDefault(
				`castleSessionIDs/${userA}/${userB}`,
				StringProto,
				() => uuid(true)
			);
		}
	);

	/** Gets contact ID based on username. */
	public readonly getContactID		= memoize(async (username?: string) : Promise<string> =>
		!username ? '' : this.accountDatabaseService.getOrSetDefault(
			`contactIDs/${username}`,
			StringProto,
			async () => {
				const id	= uuid();

				await this.accountDatabaseService.setItem(
					`contactUsernames/${id}`,
					StringProto,
					username,
					SecurityModels.unprotected
				);

				return id;
			},
			SecurityModels.unprotected
		)
	);

	/** Gets contact username based on ID. */
	public readonly getContactUsername	= memoize(async (id?: string) : Promise<string> => {
		if (!id) {
			throw new Error('Invalid contact ID.');
		}

		return this.accountDatabaseService.getItem(
			`contactUsernames/${id}`,
			StringProto,
			SecurityModels.unprotected
		);
	});

	/** Indicates whether spinner should be displayed. */
	public readonly showSpinner: BehaviorSubject<boolean>	= new BehaviorSubject(true);

	/** Accepts incoming contact request. */
	public async acceptContactRequest (username: string) : Promise<void> {
		await this.accountDatabaseService.setItem(
			this.contactURL(username),
			AccountContactState,
			{state: AccountContactState.States.Confirmed},
			SecurityModels.unprotected,
			undefined,
			true
		);
	}

	/** Adds contact. */
	public async addContact (username: string) : Promise<void> {
		await this.accountDatabaseService.setItem(
			this.contactURL(username),
			AccountContactState,
			{state: AccountContactState.States.OutgoingRequest},
			SecurityModels.unprotected,
			undefined,
			true
		);
	}

	/** Contact URL. */
	public contactURL (username: string) : string {
		return `contacts/${normalize(username)}`;
	}

	/** Initializes service. */
	public init (accountUserLookupService: AccountUserLookupService) : void {
		this.accountUserLookupService.resolve(accountUserLookupService);
	}

	/** Indicates whether the user is already a contact. */
	public async isContact (username: string) : Promise<boolean> {
		return this.accountDatabaseService.hasItem(this.contactURL(username));
	}

	/** Removes contact. */
	public async removeContact (username: string) : Promise<void> {
		await this.accountDatabaseService.removeItem(this.contactURL(username));
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
	public watchIfContact (
		username: string,
		subscriptions?: Subscription[]
	) : Observable<boolean> {
		return this.accountDatabaseService.watchExists(
			this.contactURL(username),
			subscriptions
		);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly databaseService: DatabaseService
	) {
		super();

		this.accountDatabaseService.getListKeys('contacts').then(usernames => {
			if (usernames.length < 1) {
				this.showSpinner.next(false);
			}
		});

		this.contactList.pipe(skip(1), take(1)).toPromise().then(() => {
			this.showSpinner.next(false);
		});
	}
}
