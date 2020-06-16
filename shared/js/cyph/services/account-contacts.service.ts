/* eslint-disable max-lines */

import {ComponentType} from '@angular/cdk/portal';
import {ChangeDetectorRef, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import throttle from 'lodash-es/throttle';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
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
	CyphPlans,
	IAccountContactState,
	IAccountMessagingGroup,
	NeverProto,
	StringProto
} from '../proto';
import {filterUndefined, filterUndefinedOperator} from '../util/filter';
import {cacheObservable, toBehaviorSubject} from '../util/flatten-observable';
import {normalize, normalizeArray} from '../util/formatting';
import {observableAll} from '../util/observable-all';
import {uuid} from '../util/uuid';
import {resolvable} from '../util/wait';
import {AccountFilesService} from './account-files.service';
import {AccountInviteService} from './account-invite.service';
import {AccountPostsService} from './account-posts.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {ConfigService} from './config.service';
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
			changeDetectorRef: ChangeDetectorRef;
			chipInput: boolean;
			contactList: Observable<(IContactListItem | User)[]> | undefined;
			externalUsers: boolean;
			getContacts?: IResolvable<User[]>;
			includeGroups?: boolean;
			minimum?: number;
			title?: string;
		}>
	>();

	/** @ignore */
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

	/** @ignore */
	private readonly getCastleSessionDataInternal = memoize(
		(username: string) =>
			throttle(async () => {
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
			}, 120000)
	);

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
	> = cacheObservable(
		observableAll([
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
		this.subscriptions
	);

	/** List of Inner Circle contacts for current user, sorted alphabetically by username. */
	public readonly contactListInnerCircle: Observable<
		User[]
	> = cacheObservable(
		observableAll([
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

	/** @ignore */
	private async addToInnerCircleConfirm () : Promise<boolean> {
		if (
			!(await this.dialogService.confirm({
				content: this.stringsService.addContactInnerCirclePrompt,
				title: this.stringsService.addContactInnerCircleTitle
			}))
		) {
			return false;
		}

		const planConfig = this.configService.planConfig[
			(await this.accountDatabaseService.currentUser.value?.user.cyphPlan.getValue())
				?.plan || CyphPlans.Free
		];

		if (typeof planConfig.innerCircleLimit === 'number') {
			const innerCircleCount = (await this.accountDatabaseService.getList(
				'contactsInnerCircle',
				AccountContactState,
				SecurityModels.unprotected,
				undefined,
				undefined,
				false
			)).filter(o => o.state === AccountContactState.States.Confirmed)
				.length;

			if (innerCircleCount >= planConfig.innerCircleLimit) {
				await this.dialogService.alert({
					content: this.stringsService.setParameters(
						this.stringsService.addContactInnerCircleUpgrade,
						{limit: planConfig.innerCircleLimit.toString()}
					),
					title: this.stringsService.addContactInnerCircleTitle
				});
				return false;
			}
		}

		return true;
	}

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
		innerCircle: boolean = false,
		skipConfirmation: boolean = false
	) : Promise<void> {
		if (!username) {
			return;
		}

		if (
			innerCircle &&
			!(skipConfirmation || (await this.addToInnerCircleConfirm()))
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

				close();

				if (
					contacts.length < 1 ||
					(newContactType === NewContactTypes.innerCircle &&
						!(await this.addToInnerCircleConfirm()))
				) {
					return;
				}

				/* eslint-disable-next-line no-unused-expressions */
				this.interstitial?.next(true);

				await Promise.all(
					contacts.map(async user =>
						this.addContact(
							user.username,
							newContactType === NewContactTypes.innerCircle,
							true
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
	public contactURL (
		username: string,
		innerCircle: boolean = false
	) : string {
		return `${innerCircle ? 'contactsInnerCircle' : 'contacts'}/${normalize(
			username
		)}`;
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
		return this.getCastleSessionDataInternal(username)();
	}

	/** Indicates whether the user is already a contact. */
	public async isContact (
		username?: string,
		confirmed: boolean = false,
		innerCircle: boolean = false
	) : Promise<boolean> {
		if (!username) {
			return false;
		}

		const contactURL = this.contactURL(username, innerCircle);

		return !confirmed ?
			this.accountDatabaseService.hasItem(contactURL) :
			(await this.accountDatabaseService
				.getItem(
					contactURL,
					AccountContactState,
					SecurityModels.unprotected
				)
				.then(o => o.state)
				.catch(() => AccountContactState.States.None)) ===
				AccountContactState.States.Confirmed;
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
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();

		/* Workaround for unnecessary drag on performance */
		if (locationData.hash.startsWith('#account-burner/')) {
			return;
		}

		this.subscriptions.push(
			observableAll([
				this.accountPostsService.pipe(filterUndefinedOperator()),
				this.contactListInnerCircle.pipe(
					switchMap(contactListInnerCircle =>
						observableAll(
							contactListInnerCircle.map(user =>
								user.accountContactState
									.watch()
									.pipe(map(() => user))
							)
						)
					),
					switchMap(async contactListInnerCircle =>
						(await Promise.all(
							contactListInnerCircle.map(async user =>
								Promise.all([
									user,
									user.accountContactState.getValue()
								])
							)
						))
							.filter(
								([_, contactState]) =>
									contactState.innerCircle &&
									contactState.state ===
										AccountContactState.States.Confirmed
							)
							.map(([user]) => user.username)
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
