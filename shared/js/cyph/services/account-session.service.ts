/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, of} from 'rxjs';
import {IContactListItem, UserLike} from '../account';
import {AccountContactsComponent} from '../components/account-contacts';
import {MaybePromise} from '../maybe-promise-type';
import {
	AccountContactState,
	IAccountMessagingGroup,
	IBurnerSession,
	ISessionMessage,
	SessionMessageList,
	StringProto
} from '../proto';
import {
	ISessionMessageAdditionalData,
	ISessionMessageData,
	RpcEvents
} from '../session';
import {normalizeArray} from '../util/formatting';
import {debugLog} from '../util/log';
import {uuid} from '../util/uuid';
import {resolvable, resolvedResolvable} from '../util/wait/resolvable';
import {AccountContactsService} from './account-contacts.service';
import {AccountSessionInitService} from './account-session-init.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountService} from './account.service';
import {AnalyticsService} from './analytics.service';
import {BasicSessionInitService} from './basic-session-init.service';
import {ChannelService} from './channel.service';
import {ConfigService} from './config.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {EphemeralSessionService} from './ephemeral-session.service';
import {ErrorService} from './error.service';
import {LocalStorageService} from './local-storage.service';
import {NotificationService} from './notification.service';
import {SessionInitService} from './session-init.service';
import {SessionWrapperService} from './session-wrapper.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';

/**
 * Account session service.
 */
@Injectable()
export class AccountSessionService extends SessionService {
	/** @ignore */
	private initiated: boolean = false;

	/** @inheritDoc */
	protected readonly account: boolean = true;

	/** If true, this is an ephemeral sub-session. */
	public ephemeralSubSession: boolean = false;

	/** Metadata of current group, if applicable. */
	public groupMetadata?: {
		id: string;
		usernames: string[];
	};

	/** @inheritDoc */
	public pairwiseSessionData?: {
		localUsername?: string;
		remoteUsername?: string;
	};

	/** @inheritDoc */
	public readonly ready = resolvable<true>(true);

	/** @inheritDoc */
	protected async abortSetup () : Promise<void> {
		const remoteUser = await this.remoteUser;

		if (remoteUser?.username) {
			await this.accountContactsService.resetCastleSession(
				remoteUser.username
			);
		}

		await super.abortSetup();
	}

	/** @inheritDoc */
	protected async channelOnClose () : Promise<void> {
		if (this.group.value) {
			throw new Error(
				'Master channelOnClose should not be used in a group session.'
			);
		}

		if (this.ephemeralSubSession) {
			await super.channelOnClose();
		}
	}

	/** @inheritDoc */
	protected async channelOnOpen (isAlice: boolean) : Promise<void> {
		if (this.group.value) {
			throw new Error(
				'Master channelOnOpen should not be used in a group session.'
			);
		}

		await super.channelOnOpen(isAlice);
	}

	/** @inheritDoc */
	protected async getSessionMessageAuthor (
		message: ISessionMessageData
	) : Promise<Observable<string> | undefined> {
		if (!message.authorID) {
			return;
		}

		const user = await this.accountUserLookupService.getUser(
			message.authorID
		);

		if (user) {
			return user.realUsername;
		}

		return;
	}

	/** @inheritDoc */
	public async addToBurnerGroup (name?: string) : Promise<{
		callType?: 'audio' | 'video';
		id: string;
		url: string;
		username?: string;
	}> {
		if (this.internalSessionService) {
			return this.internalSessionService.addToBurnerGroup(name);
		}

		return super.addToBurnerGroup(name);
	}

	/** @inheritDoc */
	public close () : void {
		if (this.internalSessionService) {
			this.internalSessionService.close();
			return;
		}

		if (this.ephemeralSubSession) {
			super.close();
		}
	}

	/** Normalizes username or username list. */
	public normalizeUsername (username: string) : string;
	public normalizeUsername (username: string[]) : string[];
	public normalizeUsername (username: string | string[]) : string | string[];
	public normalizeUsername (username: string | string[]) : string | string[] {
		if (username instanceof Array) {
			username = normalizeArray(username);

			if (this.accountDatabaseService.currentUser.value) {
				const {user} = this.accountDatabaseService.currentUser.value;
				username = username.filter(s => s !== user.username);
			}

			if (username.length === 1) {
				username = username[0];
			}
		}

		return username;
	}

	/** @inheritDoc */
	public async send (
		...messages: [
			string,

			(
				| ISessionMessageAdditionalData
				| ((
						timestamp: number
				  ) => MaybePromise<ISessionMessageAdditionalData>)
			)
		][]
	) : Promise<{
		confirmPromise: Promise<void>;
		newMessages: (ISessionMessage & {data: ISessionMessageData})[];
	}> {
		if (this.internalSessionService) {
			return this.internalSessionService.send(...messages);
		}

		return super.send(...messages);
	}

	/** Sets the remote user we're chatting with. */
	/* eslint-disable-next-line complexity */
	public async setUser (
		chat:
			| {
					burnerSession: IBurnerSession & {
						anonymousChannelID?: string;
					};
					passive?: boolean;
			  }
			| {group: IAccountMessagingGroup; id: string}
			| {username: string},
		sessionSubID?: string,
		ephemeralSubSession: boolean = false,
		setHeader: boolean = true
	) : Promise<void> {
		if (this.initiated) {
			throw new Error('User already set.');
		}

		debugLog(() => ({
			accountSessionInit: {
				chat,
				ephemeralSubSession,
				sessionSubID,
				setHeader
			}
		}));

		if ('burnerSession' in chat) {
			if (!this.accountDatabaseService.currentUser.value) {
				throw new Error('No user signed in.');
			}

			const anonymousChannelID =
				'anonymousChannelID' in chat.burnerSession ?
					chat.burnerSession.anonymousChannelID :
					undefined;

			if (
				!anonymousChannelID &&
				(!chat.burnerSession.members ||
					chat.burnerSession.members.length < 1)
			) {
				throw new Error('No session members.');
			}

			this.accountService.autoUpdate.next(false);

			this.accountService.setHeader({
				mobile: this.stringsService.burner
			});

			this.accountSessionInitService.ephemeral = true;
			this.ephemeralSubSession = true;

			const remoteUser: UserLike = {
				anonymous: true,
				avatar: undefined,
				contactID: undefined,
				coverImage: undefined,
				name: undefined,
				pseudoAccount: false,
				username: undefined
			};

			this.remoteUser.resolve(remoteUser);

			const sessionInit = new BasicSessionInitService();

			sessionInit.accountsBurnerAliceData = {
				passive: !!chat.passive,
				remoteUser,
				username:
					this.accountDatabaseService.currentUser.value.user.username
			};

			sessionInit.callType = this.sessionInitService.callType;
			sessionInit.timeString = this.sessionInitService.timeString;

			sessionInit.ephemeralGroupMembers.resolve(
				chat.burnerSession.members || []
			);
			sessionInit.setID(
				anonymousChannelID || '',
				undefined,
				undefined,
				true
			);

			const ephemeralSessionService = new EphemeralSessionService(
				this.analyticsService,
				this.castleService,
				this.channelService,
				this.databaseService,
				this.dialogService,
				this.envService,
				this.errorService,
				this.potassiumService,
				sessionInit,
				this.sessionWrapperService,
				this.stringsService,
				this.router,
				this.accountService,
				this.accountDatabaseService,
				this.configService,
				this.notificationService
			);

			this.p2pWebRTCService.then(p2pWebRTCService => {
				ephemeralSessionService.p2pWebRTCService.resolve(
					p2pWebRTCService
				);
			});

			this.subscriptions.push(
				ephemeralSessionService.isBurnerGroupHost.subscribe(
					this.isBurnerGroupHost
				),
				ephemeralSessionService.joinConfirmationWait.subscribe(
					this.joinConfirmationWait
				),
				ephemeralSessionService.state.cyphIDs.subscribe(
					this.state.cyphIDs
				),
				ephemeralSessionService.state.ephemeralStateInitialized.subscribe(
					this.state.ephemeralStateInitialized
				),
				ephemeralSessionService.state.isAlice.subscribe(
					this.state.isAlice
				),
				ephemeralSessionService.state.isAlive.subscribe(
					this.state.isAlive
				),
				ephemeralSessionService.state.isConnected.subscribe(
					this.state.isConnected
				),
				ephemeralSessionService.state.sharedSecrets.subscribe(
					this.state.sharedSecrets
				),
				ephemeralSessionService.state.startingNewCyph.subscribe(
					this.state.startingNewCyph
				),
				ephemeralSessionService.state.wasInitiatedByAPI.subscribe(
					this.state.wasInitiatedByAPI
				)
			);

			/* TODO: Factor out shared logic here and in SessionService.setGroup */

			for (const rpcEvent of [RpcEvents.text, RpcEvents.p2pRequest]) {
				ephemeralSessionService.on(rpcEvent, newEvents => {
					this.trigger(rpcEvent, newEvents);
				});
			}

			for (const event of <
				(
					| 'beginChat'
					| 'childChannelsConnected'
					| 'closed'
					| 'connected'
					| 'channelConnected'
					| 'connectFailure'
					| 'cyphNotFound'
					| 'initialMessagesProcessed'
					| 'opened'
					| 'ready'
				)[]
			> [
				'beginChat',
				'childChannelsConnected',
				'closed',
				'connected',
				'channelConnected',
				'connectFailure',
				'cyphNotFound',
				'initialMessagesProcessed',
				'opened',
				'ready'
			]) {
				ephemeralSessionService[event].then(() => {
					this[event].resolve();
				});
			}

			for (const event of <'joinConfirmation'[]> ['joinConfirmation']) {
				this[event].then(() => {
					ephemeralSessionService[event].resolve();
				});
			}

			this.internalSessionService = ephemeralSessionService;

			await ephemeralSessionService.opened;

			this.apiFlags.disableP2P =
				ephemeralSessionService.apiFlags.disableP2P;
			this.apiFlags.modestBranding =
				ephemeralSessionService.apiFlags.modestBranding;

			this.subscriptions.push(
				ephemeralSessionService.group.subscribe(this.group)
			);

			this.ready.resolve();
			return;
		}

		if ('username' in chat) {
			chat.username = this.normalizeUsername(chat.username);

			this.pairwiseSessionData = {
				localUsername: (
					await this.accountDatabaseService.getCurrentUser()
				).user.username,
				remoteUsername: chat.username
			};
		}

		this.initiated = true;
		this.sessionSubID = sessionSubID;

		/* Group session init */

		if ('group' in chat) {
			const usernames = this.normalizeUsername(
				chat.group.usernames || []
			);

			if (setHeader) {
				const contactList = of(
					usernames.map(
						(username) : IContactListItem => ({
							contactState: of(AccountContactState.States.None),
							unreadMessageCount: of(0),
							user: resolvedResolvable(
								this.accountUserLookupService
									.getUser(username)
									.catch(() => undefined)
							),
							username
						})
					)
				);

				this.accountService.setHeader(
					{
						mobile: this.stringsService.group
					},
					[
						{
							handler: async () =>
								this.dialogService.baseDialog(
									AccountContactsComponent,
									o => {
										const previousValues = {
											contactList: o.contactList,
											readOnly: o.readOnly
										};

										o.contactList = contactList;
										o.readOnly = true;

										/* eslint-disable-next-line @typescript-eslint/tslint/config */
										o.ngOnChanges({
											contactList: {
												currentValue: o.contactList,
												firstChange: false,
												isFirstChange: () => false,
												previousValue:
													previousValues.contactList
											},
											readOnly: {
												currentValue: o.readOnly,
												firstChange: false,
												isFirstChange: () => false,
												previousValue:
													previousValues.readOnly
											}
										});
									},
									undefined,
									true
								),
							icon: 'group',
							label: this.stringsService.viewGroupMembers
						}
					]
				);
			}

			/* Create N pairwise sessions, one for each other group member */

			this.sessionSubID = `group-${chat.group.castleSessionID}${
				this.sessionSubID ? `-${this.sessionSubID}` : ''
			}`;

			const group = await Promise.all(
				usernames.map(async username => {
					const session = this.spawn(
						this.sessionInitService.spawn(true)
					);
					await session.setUser(
						{username},
						this.sessionSubID,
						ephemeralSubSession,
						false
					);
					return session;
				})
			);

			this.groupMetadata = {id: chat.id, usernames};

			this.setGroup(group);

			this.remoteUser.resolve(undefined);
			return;
		}

		/* Pairwise session init */

		this.channelConnected
			.then(() => {
				this.childChannelsConnected.resolve();
			})
			.catch(() => {});

		(async () => {
			const {castleSessionID} =
				await this.accountContactsService.getCastleSessionData(
					chat.username
				);

			const sessionID = !this.sessionSubID ?
				castleSessionID :
				this.potassiumService.toHex(
					await this.potassiumService.hash.hash(
						`${castleSessionID}-${this.sessionSubID}`
					)
				);

			if (ephemeralSubSession) {
				if (!this.sessionSubID) {
					throw new Error(
						'Cannot start ephemeral sub-session without sessionSubID.'
					);
				}

				this.ephemeralSubSession = true;

				await this.init(sessionID);
				return;
			}

			const castleSessionURL = `castleSessions/${castleSessionID}/session`;
			const sessionURL = `castleSessions/${sessionID}/session`;

			this.incomingMessageQueue =
				this.accountDatabaseService.getAsyncList(
					`${sessionURL}/incomingMessageQueue`,
					SessionMessageList,
					undefined,
					undefined,
					undefined,
					false
				);

			this.incomingMessageQueueLock =
				this.accountDatabaseService.lockFunction(
					`${sessionURL}/incomingMessageQueueLock${
						sessionSubID ? `/${sessionSubID}` : ''
					}`
				);

			await this.init(
				castleSessionID,
				sessionID,
				await this.accountDatabaseService.getOrSetDefault(
					`${castleSessionURL}/channelUserID`,
					StringProto,
					() => uuid(true)
				)
			);
		})();

		if (
			await this.accountDatabaseService.hasItem(
				`users/${chat.username}/pseudoAccount`
			)
		) {
			const contactState = await this.accountContactsService
				.contactState(chat.username)
				.getValue();

			const name =
				contactState.name ||
				(contactState.email && `<${contactState.email}>`) ||
				this.stringsService.friend;

			this.remoteUser.resolve({
				anonymous: false,
				avatar: undefined,
				contactID: this.accountContactsService.getContactID(
					chat.username
				),
				coverImage: undefined,
				name: of(name),
				pseudoAccount: true,
				username: chat.username
			});

			this.remoteUsername.next(chat.username);

			if (setHeader) {
				this.accountService.setHeader({mobile: name});
			}

			this.ready.resolve();
			return;
		}

		this.remoteUsername.next(chat.username);

		if (setHeader) {
			this.accountService.setHeader({mobile: `@${chat.username}`});
		}

		const userPromise = this.accountUserLookupService.getUser(
			chat.username
		);

		userPromise.then(user => {
			if (user) {
				this.subscriptions.push(
					user.realUsername.subscribe(this.remoteUsername)
				);

				if (setHeader) {
					this.accountService.setHeader(user);
				}
			}

			debugLog(() => ({accountSessionInitComplete: {user}}));
		});

		this.remoteUser.resolve(userPromise);
		this.ready.resolve();
	}

	/** @inheritDoc */
	public spawn (
		sessionInitService: SessionInitService = this.sessionInitService.spawn(),
		castleService: CastleService = this.castleService.spawn()
	) : AccountSessionService {
		return new AccountSessionService(
			this.analyticsService,
			castleService,
			this.channelService.spawn(),
			this.databaseService,
			this.dialogService,
			this.envService,
			this.errorService,
			this.potassiumService,
			sessionInitService,
			this.sessionWrapperService.spawn(),
			this.stringsService,
			this.router,
			this.accountService,
			this.accountContactsService,
			this.accountDatabaseService,
			this.accountSessionInitService,
			this.accountUserLookupService,
			this.configService,
			this.localStorageService,
			this.notificationService
		);
	}

	constructor (
		analyticsService: AnalyticsService,
		castleService: CastleService,
		channelService: ChannelService,
		databaseService: DatabaseService,
		dialogService: DialogService,
		envService: EnvService,
		errorService: ErrorService,
		potassiumService: PotassiumService,
		sessionInitService: SessionInitService,
		sessionWrapperService: SessionWrapperService,
		stringsService: StringsService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountSessionInitService: AccountSessionInitService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly notificationService: NotificationService
	) {
		super(
			analyticsService,
			castleService,
			channelService,
			databaseService,
			dialogService,
			envService,
			errorService,
			potassiumService,
			sessionInitService,
			sessionWrapperService,
			stringsService
		);
	}
}
