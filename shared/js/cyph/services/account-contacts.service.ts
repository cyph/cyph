import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, combineLatest, Observable, Subscription} from 'rxjs';
import {mergeMap, skip, take} from 'rxjs/operators';
import {IContactListItem, SecurityModels, User} from '../account';
import {BaseProvider} from '../base-provider';
import {IAsyncValue} from '../iasync-value';
import {IResolvable} from '../iresolvable';
import {
	AccountContactState,
	AccountFileRecord,
	IAccountContactState,
	IAccountMessagingGroup,
	NeverProto,
	NotificationTypes,
	StringProto
} from '../proto';
import {filterUndefined} from '../util/filter';
import {toBehaviorSubject} from '../util/flatten-observable';
import {normalize, normalizeArray} from '../util/formatting';
import {uuid} from '../util/uuid';
import {resolvable} from '../util/wait';
import {AccountFilesService} from './account-files.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';
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

	private readonly contactListHelpers	= {
		groupData: memoize(
			(groupData: {group: IAccountMessagingGroup; id: string; incoming: boolean}) => ({
				groupData,
				unreadMessageCount: toBehaviorSubject<number>(
					this.accountDatabaseService.getAsyncMap(
						`unreadMessages/${groupData.group.castleSessionID}`,
						NeverProto,
						SecurityModels.unprotected
					).watchSize(),
					0
				),
				user: Promise.resolve(undefined),
				username: `group: ${groupData.group.castleSessionID}`
			}),
			(groupData: {id: string; incoming: boolean}) =>
				`${groupData.id} ${groupData.incoming.toString()}`
		),
		user: memoize(async (username: string) => {
			const user	= (await this.accountUserLookupService.promise).getUser(username);

			return {
				unreadMessageCount: toBehaviorSubject<number>(
					user.then(async o => o ? o.unreadMessageCount : 0),
					0,
					this.subscriptions
				),
				user,
				username
			};
		})
	};

	/** List of contacts for current user, sorted alphabetically by username. */
	public readonly contactList: Observable<(IContactListItem|User)[]>	= toBehaviorSubject(
		combineLatest(
			this.accountFilesService.filesListFilteredWithData.messagingGroups(),
			this.accountFilesService.incomingFilesFilteredWithData.messagingGroups(),
			this.accountDatabaseService.watchListKeys('contacts', this.subscriptions)
		).pipe(mergeMap(async ([groups, incomingGroups, usernames]) => [
			...[
				...incomingGroups.map(o => ({group: o.data, id: o.record.id, incoming: true})),
				...groups.map(o => ({group: o.data, id: o.record.id, incoming: false}))
			].map(
				this.contactListHelpers.groupData
			),
			...(await Promise.all(normalizeArray(usernames).map(this.contactListHelpers.user)))
		])),
		[],
		this.subscriptions
	);

	/** Contact state. */
	public readonly contactState	= memoize(
		(username: string) : IAsyncValue<IAccountContactState> =>
			this.accountDatabaseService.getAsyncValue(
				this.contactURL(username),
				AccountContactState,
				SecurityModels.unprotected,
				undefined,
				undefined,
				undefined,
				true
			)
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

	/** Gets Castle session data based on username. */
	public readonly getCastleSessionData	= memoize(async (username: string) : Promise<{
		castleSessionID: string;
		castleSessionURL: string;
	}> => {
		const currentUserUsername	=
			(await this.accountDatabaseService.getCurrentUser()).user.username
		;

		const [userA, userB]		= normalizeArray([currentUserUsername, username]);

		if (!(userA && userB)) {
			return {
				castleSessionID: '',
				castleSessionURL: ''
			};
		}

		const castleSessionURL	= `castleSessions/${userA}/${userB}`;

		return {
			castleSessionID: await this.databaseService.getOrSetDefault(
				`${castleSessionURL}/id`,
				StringProto,
				() => uuid(true),
				true
			),
			castleSessionURL
		};
	});

	/** Gets contact username or group metadata based on ID. */
	public readonly getChatData			= memoize(async (id?: string) : Promise<
		{group: IAccountMessagingGroup}|{username: string}
	> => {
		if (!id) {
			throw new Error('Invalid contact ID.');
		}

		try {
			return {username: await this.getContactUsername(id)};
		}
		catch {
			return {
				group: await this.accountFilesService.downloadFile(
					id,
					AccountFileRecord.RecordTypes.MessagingGroup
				).result
			};
		}
	});

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

		await this.accountDatabaseService.notify(
			username,
			NotificationTypes.ContactAccept
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

		await this.accountDatabaseService.notify(
			username,
			NotificationTypes.ContactRequest
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
		private readonly accountFilesService: AccountFilesService,

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
