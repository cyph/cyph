/* eslint-disable max-lines */

import {ComponentType} from '@angular/cdk/portal';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, combineLatest, Observable, Subscription} from 'rxjs';
import {map, skip, switchMap, take} from 'rxjs/operators';
import {
	IContactListItem,
	NewContactTypes,
	SecurityModels,
	User
} from '../account';
import {BaseProvider} from '../base-provider';
import {
	emailInput,
	getFormValue,
	input,
	newForm,
	newFormComponent,
	newFormContainer
} from '../forms';
import {IAsyncValue} from '../iasync-value';
import {IResolvable} from '../iresolvable';
import {
	AccountContactState,
	AccountFileRecord,
	IAccountContactState,
	IAccountMessagingGroup,
	NeverProto,
	StringProto
} from '../proto';
import {filterUndefined, filterUndefinedOperator} from '../util/filter';
import {toBehaviorSubject} from '../util/flatten-observable';
import {normalize, normalizeArray} from '../util/formatting';
import {uuid} from '../util/uuid';
import {resolvable} from '../util/wait';
import {AccountFilesService} from './account-files.service';
import {AccountInviteService} from './account-invite.service';
import {AccountPostsService} from './account-posts.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {StringsService} from './strings.service';

/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService extends BaseProvider {
	/**
	 * Resolves circular dependency needed for addContactPrompt to work.
	 * @see AccountContactsSearchComponent
	 */
	public static readonly accountContactsSearchComponent = resolvable<
		ComponentType<{
			chipInput: boolean;
			contactList: Observable<(IContactListItem | User)[]> | undefined;
			externalUsers: boolean;
			getContacts?: IResolvable<User[]>;
			includeGroups?: boolean;
			minimum?: number;
			title?: string;
		}>
	>();

	private readonly contactListHelpers = {
		groupData: memoize(
			(groupData: {
				group: IAccountMessagingGroup;
				id: string;
				incoming: boolean;
			}) => ({
				groupData,
				unreadMessageCount: toBehaviorSubject<number>(
					this.accountDatabaseService
						.getAsyncMap(
							`unreadMessages/${groupData.id}`,
							NeverProto,
							SecurityModels.unprotected
						)
						.watchSize(),
					0
				),
				user: Promise.resolve(undefined),
				username: `group: ${groupData.group.castleSessionID}`
			}),
			(groupData: {id: string; incoming: boolean}) =>
				`${groupData.id} ${groupData.incoming.toString()}`
		),
		user: memoize((accountUserLookupService: AccountUserLookupService) =>
			memoize((username: string) => {
				const user = accountUserLookupService.getUser(username, true);

				return {
					unreadMessageCount: accountUserLookupService.getUnreadMessageCount(
						username
					),
					user,
					username
				};
			})
		)
	};

	/** @see AccountPostsService */
	public readonly accountPostsService = new BehaviorSubject<
		AccountPostsService | undefined
	>(undefined);

	/** @see AccountUserLookupService */
	public readonly accountUserLookupService = new BehaviorSubject<
		AccountUserLookupService | undefined
	>(undefined);

	/** List of contacts for current user, sorted alphabetically by username. */
	public readonly contactList: Observable<
		(IContactListItem | User)[]
	> = toBehaviorSubject(
		combineLatest([
			this.accountFilesService.filesListFilteredWithData.messagingGroups(),
			this.accountFilesService.incomingFilesFilteredWithData.messagingGroups(),
			this.accountDatabaseService.watchListKeys(
				'contacts',
				this.subscriptions
			),
			this.accountUserLookupService.pipe(filterUndefinedOperator())
		]).pipe(
			map(
				([
					groups,
					incomingGroups,
					usernames,
					accountUserLookupService
				]) => [
					...[
						...incomingGroups.map(o => ({
							group: o.data,
							id: o.record.id,
							incoming: true
						})),
						...groups.map(o => ({
							group: o.data,
							id: o.record.id,
							incoming: false
						}))
					].map(this.contactListHelpers.groupData),
					...normalizeArray(usernames).map(
						this.contactListHelpers.user(accountUserLookupService)
					)
				]
			)
		),
		[],
		this.subscriptions
	);

	/** List of Inner Circle contacts for current user, sorted alphabetically by username. */
	public readonly contactListInnerCircle: Observable<
		User[]
	> = toBehaviorSubject(
		combineLatest([
			this.accountDatabaseService.watchListKeys(
				'contactsInnerCircle',
				this.subscriptions
			),
			this.accountUserLookupService.pipe(filterUndefinedOperator())
		]).pipe(
			switchMap(async ([usernames, accountUserLookupService]) =>
				filterUndefined(
					await Promise.all(
						normalizeArray(usernames).map(async username =>
							accountUserLookupService.getUser(username)
						)
					)
				)
			)
		),
		[],
		this.subscriptions
	);

	/** Contact state. */
	public readonly contactState = memoize(
		(username: string) : IAsyncValue<IAccountContactState> =>
			this.accountDatabaseService.getAsyncValue(
				this.contactURL(username),
				AccountContactState,
				SecurityModels.unprotected
			)
	);

	/** Fully loads contact list. */
	public readonly fullyLoadContactList = memoize(
		(
			contactList: Observable<(IContactListItem | User)[]>
		) : Observable<User[]> =>
			toBehaviorSubject(
				contactList.pipe(
					switchMap(async contacts =>
						filterUndefined(
							await Promise.all(
								contacts.map(async contact =>
									contact instanceof User ?
										contact :
										contact.user
								)
							)
						)
					)
				),
				[],
				this.subscriptions
			)
	);

	/** Gets contact username or group metadata based on ID. */
	public readonly getChatData = memoize(
		async (
			id?: string
		) : Promise<
			{group: IAccountMessagingGroup; id: string} | {username: string}
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
					).result,
					id
				};
			}
		}
	);

	/** Gets contact ID based on username. */
	public readonly getContactID = memoize(
		async (username?: string) : Promise<string> =>
			!username ?
				'' :
				this.accountDatabaseService.getOrSetDefault(
					`contactIDs/${username}`,
					StringProto,
					async () => {
						const id = uuid();

						await this.accountDatabaseService.setItem(
							`contactUsernames/${id}`,
							StringProto,
							username,
							SecurityModels.unprotected
						);

						return id;
					},
					SecurityModels.unprotected,
					undefined,
					true
				)
	);

	/** Gets contact username based on ID. */
	public readonly getContactUsername = memoize(
		async (id?: string) : Promise<string> => {
			if (!id) {
				throw new Error('Invalid contact ID.');
			}

			return this.accountDatabaseService.getItem(
				`contactUsernames/${id}`,
				StringProto,
				SecurityModels.unprotected
			);
		}
	);

	/** @see AccountsService.interstitial */
	public interstitial?: BehaviorSubject<boolean>;

	/** Contact list spinners. */
	public readonly spinners = {
		contacts: new BehaviorSubject<boolean>(true),
		contactsInnerCircle: new BehaviorSubject<boolean>(true)
	};

	/** Accepts incoming contact request. */
	public async acceptContactRequest (
		username?: string,
		innerCircle: boolean = false
	) : Promise<void> {
		return this.addContact(username, innerCircle);
	}

	/** Adds contact. */
	public async addContact (
		username?: string,
		innerCircle: boolean = false
	) : Promise<void> {
		if (!username) {
			return;
		}

		if (
			innerCircle &&
			!(await this.dialogService.confirm({
				content: this.stringsService.addContactInnerCirclePrompt,
				title: this.stringsService.addContactInnerCircleTitle
			}))
		) {
			return;
		}

		await this.accountDatabaseService.callFunction('setContact', {
			add: true,
			innerCircle,
			username
		});
	}

	/** Displays prompt to add a new contact. */
	public async addContactPrompt (
		newContactType: NewContactTypes = NewContactTypes.default
	) : Promise<void> {
		if (
			newContactType === NewContactTypes.default ||
			newContactType === NewContactTypes.innerCircle
		) {
			const closeFunction = resolvable<() => void>();
			const getContacts = resolvable<User[]>();

			this.dialogService.baseDialog(
				await AccountContactsService.accountContactsSearchComponent
					.promise,
				o => {
					o.chipInput = true;
					o.contactList = undefined;
					o.externalUsers = true;
					o.getContacts = getContacts;
					o.title =
						newContactType === NewContactTypes.innerCircle ?
							this.stringsService.addContactInnerCircleTitle :
							this.stringsService.addContactTitle;
				},
				closeFunction,
				true
			);

			try {
				const [contacts, close] = await Promise.all([
					getContacts.promise,
					closeFunction.promise
				]);

				if (contacts.length < 1) {
					close();
					return;
				}

				/* eslint-disable-next-line no-unused-expressions */
				this.interstitial?.next(true);
				close();

				await Promise.all(
					contacts.map(async user =>
						this.addContact(
							user.username,
							newContactType === NewContactTypes.innerCircle
						)
					)
				);
			}
			finally {
				/* eslint-disable-next-line no-unused-expressions */
				this.interstitial?.next(false);
			}

			return;
		}

		const contactForm = await this.dialogService.prompt({
			bottomSheet: true,
			content: '',
			form: newForm([
				newFormComponent([
					newFormContainer([
						input({
							label: this.stringsService.name,
							required: true
						})
					]),
					newFormContainer([
						emailInput({
							label: this.stringsService.email,
							required: true
						})
					])
				])
			]),
			title:
				newContactType === NewContactTypes.external ?
					this.stringsService.addContactTitle :
					this.stringsService.inviteContactTitle
		});

		const email = getFormValue(contactForm, 'string', 0, 1, 0);
		const name = getFormValue(contactForm, 'string', 0, 0, 0);

		if (!email || !name) {
			return;
		}

		if (newContactType === NewContactTypes.external) {
			await this.databaseService.callFunction(
				'requestPseudoRelationship',
				{email, name}
			);

			return;
		}

		await this.accountInviteService.send(email, name);
	}

	/** Contact URL. */
	public contactURL (username: string) : string {
		return `contacts/${normalize(username)}`;
	}

	/** Displays prompt to start a new group chat. */
	public async createGroupPrompt () : Promise<void> {
		const closeFunction = resolvable<() => void>();
		const getContacts = resolvable<User[]>();

		this.dialogService.baseDialog(
			await AccountContactsService.accountContactsSearchComponent.promise,
			o => {
				o.chipInput = true;
				o.getContacts = getContacts;
				o.includeGroups = false;
				o.minimum = 2;
				o.title = this.stringsService.createGroupTitle;
			},
			closeFunction,
			true
		);

		try {
			const [contacts, close] = await Promise.all([
				getContacts.promise,
				closeFunction.promise
			]);

			if (contacts.length < 1) {
				close();
				return;
			}

			/* eslint-disable-next-line no-unused-expressions */
			this.interstitial?.next(true);
			close();

			const chat = await this.accountFilesService.initMessagingGroup(
				contacts.map(user => user.username)
			);

			await this.router.navigate(['messages', chat.id]);
		}
		finally {
			/* eslint-disable-next-line no-unused-expressions */
			this.interstitial?.next(false);
		}
	}

	/** Gets Castle session data based on username. */
	public async getCastleSessionData (
		username: string
	) : Promise<{castleSessionID: string}> {
		username = normalize(username);

		if (!username) {
			return {
				castleSessionID: ''
			};
		}

		return {
			castleSessionID: await this.accountDatabaseService.callFunction(
				'getCastleSessionID',
				{username}
			)
		};
	}

	/** Indicates whether the user is already a contact. */
	public async isContact (username?: string) : Promise<boolean> {
		if (!username) {
			return false;
		}

		return this.accountDatabaseService.hasItem(this.contactURL(username));
	}

	/** Removes contact. */
	public async removeContact (username?: string) : Promise<void> {
		if (!username) {
			return;
		}

		await this.accountDatabaseService.callFunction('setContact', {
			add: false,
			username
		});
	}

	/** Gets Castle session data based on username. */
	public async resetCastleSession (username: string) : Promise<void> {
		username = normalize(username);

		if (!username) {
			return;
		}

		await this.accountDatabaseService.callFunction('resetCastleSessionID', {
			username
		});
	}

	/** Adds or removes contact. */
	public async toggleContact (username?: string) : Promise<void> {
		if (!username) {
			return;
		}

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
		private readonly router: Router,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly accountInviteService: AccountInviteService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();

		for (const [list, spinner, url] of <
			[
				typeof AccountContactsService.prototype.contactList,
				typeof AccountContactsService.prototype.spinners.contacts,
				string
			][]
		> [
			[this.contactList, this.spinners.contacts, 'contacts'],
			[
				this.contactListInnerCircle,
				this.spinners.contactsInnerCircle,
				'contactsInnerCircle'
			]
		]) {
			this.accountDatabaseService.getListKeys(url).then(usernames => {
				if (usernames.length < 1) {
					spinner.next(false);
				}
			});

			list.pipe(skip(1), take(1))
				.toPromise()
				.then(() => {
					spinner.next(false);
				});
		}

		this.subscriptions.push(
			combineLatest([
				this.accountPostsService.pipe(filterUndefinedOperator()),
				this.contactListInnerCircle.pipe(
					skip(1),
					switchMap(contactListInnerCircle =>
						combineLatest(
							contactListInnerCircle.map(user =>
								user.accountContactState
									.watch()
									.pipe(map(({state}) => ({state, user})))
							)
						)
					),
					map(contactListInnerCircle =>
						contactListInnerCircle
							.filter(
								o =>
									o.state ===
									AccountContactState.States.Confirmed
							)
							.map(o => o.user.username)
					)
				)
			]).subscribe(async ([accountPostsService, innerCircle]) =>
				accountPostsService.setCircleMembers(
					innerCircle,
					async username => {
						if (
							await this.dialogService.confirm({
								content: this.stringsService.setParameters(
									this.stringsService
										.innerCircleFinalConfirmationPrompt,
									{username}
								),
								title: this.stringsService
									.innerCircleFinalConfirmationTitle
							})
						) {
							return true;
						}

						await this.removeContact(username);

						return false;
					}
				)
			)
		);
	}
}
