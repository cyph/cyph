import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, firstValueFrom, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {SecurityModels} from '../account';
import {IChatData, IChatMessageLiveValue, States} from '../chat';
import {IAsyncSet} from '../iasync-set';
import {LocalAsyncList} from '../local-async-list';
import {
	BurnerSession,
	CallTypes,
	ChatLastConfirmedMessage,
	ChatMessage,
	ChatMessageValue,
	IAccountMessagingGroup,
	IBurnerSession,
	IChatMessage,
	NeverProto,
	NotificationTypes,
	SessionMessageDataList,
	StringArrayProto
} from '../proto';
import {normalize} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {observableAll} from '../util/observable-all';
import {resolvable} from '../util/wait/resolvable';
import {AccountContactsService} from './account-contacts.service';
import {AccountSessionInitService} from './account-session-init.service';
import {AccountSessionService} from './account-session.service';
import {AccountSettingsService} from './account-settings.service';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {ChatMessageService} from './chat-message.service';
import {ChatService} from './chat.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {NotificationService} from './notification.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {QRService} from './qr.service';
import {ScrollService} from './scroll.service';
import {SessionInitService} from './session-init.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';

/**
 * Account chat service.
 */
@Injectable()
export class AccountChatService extends ChatService {
	/** @ignore */
	private readonly chats = new Map<string, IChatData>();

	/** @ignore */
	private readonly notificationData = resolvable<{
		castleSessionID: string;
		groupID?: string;
		unreadMessagesID: string;
		usernames: string[];
	}>();

	/** @inheritDoc */
	protected readonly account: boolean = true;

	/** @inheritDoc */
	public readonly remoteUser = this.accountSessionService.remoteUser;

	/** @inheritDoc */
	protected async getAuthorID (
		author: Observable<string>
	) : Promise<string | undefined> {
		return author === this.sessionService.appUsername ?
			undefined :
		author === this.sessionService.localUsername ?
			(await this.accountDatabaseService.getCurrentUser()).user.username :
		!this.sessionInitService.ephemeral ?
			firstValueFrom(author)
				.then(normalize)
				.catch(() => undefined) :
			super.getAuthorID(author);
	}

	/** Gets async set for scrollService.unreadMessages. */
	protected async getScrollServiceUnreadMessages () : Promise<
		IAsyncSet<string>
	> {
		if (this.sessionInitService.ephemeral) {
			return super.getScrollServiceUnreadMessages();
		}

		const notificationData = await this.notificationData;

		const asyncMap = this.accountDatabaseService.getAsyncMap(
			`unreadMessages/${notificationData.unreadMessagesID}`,
			NeverProto,
			SecurityModels.unprotected
		);

		const watch = memoize(() =>
			observableAll([
				asyncMap.watchKeys(),
				this.fetchedMessageIDs.watch()
			]).pipe(
				map(
					([keys, fetchedMessageIDs]) =>
						new Set(keys.filter(k => fetchedMessageIDs.has(k)))
				)
			)
		);

		return {
			/* eslint-disable-next-line @typescript-eslint/require-await */
			addItem: async (_VALUE: string) => {},
			clear: async () => asyncMap.clear(),
			deleteItem: async (value: string) => asyncMap.removeItem(value),
			hasItem: async (value: string) => asyncMap.hasItem(value),
			size: async () => asyncMap.size(),
			watch,
			watchSize: memoize(() => watch().pipe(map(keys => keys.size)))
		};
	}

	/** @inheritDoc */
	public async abortSetup () : Promise<void> {
		const [groupID, username] = await Promise.all([
			this.notificationData.then(o => o.groupID),
			this.remoteUser.then(o =>
				o && 'username' in o ? o.username : undefined
			)
		]);

		this.sessionService.close();
		await this.router.navigate(['transition'], {skipLocationChange: true});
		await this.router.navigate([
			'',
			...(groupID ?
				['messages', groupID] :
			username ?
				['messages', 'user', username] :
				[])
		]);
	}

	/** @inheritDoc */
	public async send (
		messageType?: ChatMessageValue.Types,
		message?: IChatMessageLiveValue,
		selfDestructTimeout?: number,
		selfDestructChat?: boolean,
		keepCurrentMessage?: boolean,
		oldLocalStorageKey?: string
	) : Promise<string | undefined> {
		const [id, remoteUser] = await Promise.all([
			super.send(
				messageType,
				message,
				selfDestructTimeout,
				selfDestructChat,
				keepCurrentMessage,
				oldLocalStorageKey
			),
			this.remoteUser
		]);

		if (!id || remoteUser?.anonymous) {
			return;
		}

		const notificationData = await this.notificationData;

		await this.accountDatabaseService.notify(
			notificationData.usernames,
			NotificationTypes.Message,
			{
				groupID: notificationData.groupID,
				id
			}
		);

		return id;
	}

	/** Sets the remote user we're chatting with. */
	public async setUser (
		chat:
			| {
					burnerSession: {
						accountBurnerID?: string;
						anonymousChannelID?: string;
					};
					passive?: boolean;
			  }
			| {group: IAccountMessagingGroup; id: string}
			| {username: string},
		keepCurrentMessage: boolean = false,
		callType: 'audio' | 'video' | undefined = this.envService.callType,
		sessionSubID?: string,
		ephemeralSubSession: boolean = false,
		answering: boolean = true
	) : Promise<void> {
		const burnerSession:
			| (IBurnerSession & {anonymousChannelID?: string})
			| undefined = !('burnerSession' in chat) ?
			undefined :
		chat.burnerSession.accountBurnerID ?
			await this.accountDatabaseService.getItem(
				`burnerSessions/${chat.burnerSession.accountBurnerID}`,
				BurnerSession
			) :
		chat.burnerSession.anonymousChannelID ?
			{
				anonymousChannelID: chat.burnerSession.anonymousChannelID,
				callType:
					callType === 'audio' ?
						CallTypes.Audio :
						callType === 'video' ?
						CallTypes.Video :
						CallTypes.None
			} :
			undefined;

		if (burnerSession) {
			callType =
				burnerSession.callType === CallTypes.Audio ?
					'audio' :
				burnerSession.callType === CallTypes.Video ?
					'video' :
					undefined;
		}

		this.accountSessionInitService.callType = callType;
		this.accountSessionInitService.timeString = burnerSession?.timeString;

		const callRequestPromise = callType ?
			(async () => {
				await this.p2pWebRTCService.accept(callType, true);

				if (burnerSession) {
					await this.p2pWebRTCService.initUserMedia(callType);
					return false;
				}

				return true;
			})().then(async requestCall =>
				requestCall && !answering && callType ?
					this.p2pWebRTCService.request(callType) :
					undefined
			) :
			Promise.resolve();

		if (burnerSession) {
			await this.accountSessionService.setUser({...chat, burnerSession});
			this.resolvers.chatConnected.resolve();
			await callRequestPromise;
			return;
		}

		if ('burnerSession' in chat) {
			return;
		}

		if ('username' in chat) {
			chat.username = this.accountSessionService.normalizeUsername(
				chat.username
			);
		}

		const notificationData =
			'username' in chat ?
				{
					castleSessionID: (
							await this.accountContactsService.getCastleSessionData(
								chat.username
							)
						).castleSessionID,
					unreadMessagesID: chat.username,
					usernames: [chat.username]
				} :
				{
					castleSessionID: chat.group.castleSessionID,
					groupID: chat.id,
					unreadMessagesID: chat.id,
					usernames: chat.group.usernames ?
							this.accountSessionService.normalizeUsername(
								chat.group.usernames
							) :
							[]
				};

		this.notificationData.resolve(notificationData);

		const url = `castleSessions/${notificationData.castleSessionID}`;

		this.chatSubject.next(
			ephemeralSubSession ?
				{
					...this.getDefaultChatData(),
					isConnected: true,
					state: States.chat
				} :
				getOrSetDefault(
					this.chats,
					notificationData.castleSessionID,
					() => ({
						currentMessage: keepCurrentMessage ?
								this.chat.currentMessage :
								{},
						futureMessages: this.accountDatabaseService.getAsyncMap(
								`${url}/futureMessages`,
								SessionMessageDataList,
								undefined,
								undefined,
								undefined,
								true
							),
						initProgress: new BehaviorSubject(0),
						isConnected: true,
						isDisconnected: false,
						isFriendTyping: new BehaviorSubject<boolean>(false),
						isMessageChanged: false,
						lastConfirmedMessage:
							this.accountDatabaseService.getAsyncValue(
								`${url}/lastConfirmedMessage`,
								ChatLastConfirmedMessage
							),
						lastUnreadMessage:
							this.accountDatabaseService.getLatestKey(
								`unreadMessages/${notificationData.unreadMessagesID}`
							),
						messageList: this.accountDatabaseService.getAsyncList(
								`${url}/messageList`,
								StringArrayProto,
								undefined,
								undefined,
								undefined,
								true
							),
						messages: this.accountDatabaseService.getAsyncMap(
								`${url}/messages`,
								ChatMessage,
								undefined,
								undefined,
								undefined,
								true
							),
						pendingMessageRoot: `${url}/pendingMessages`,
						pendingMessages: new LocalAsyncList<
								IChatMessage & {pending: true}
							>(),
						receiveTextLock:
							this.accountDatabaseService.lockFunction(
								`${url}/receiveTextLock`
							),
						state: States.chat,
						unconfirmedMessages: new BehaviorSubject<
								{[id: string]: boolean | undefined} | undefined
							>(undefined)
					})
				)
		);

		await this.accountSessionService.setUser(
			chat,
			sessionSubID,
			ephemeralSubSession
		);
		this.resolvers.chatConnected.resolve();
		this.p2pWebRTCService.resolveReady();
		await callRequestPromise;
	}

	constructor (
		accountSettingsService: AccountSettingsService,
		analyticsService: AnalyticsService,
		castleService: CastleService,
		channelService: ChannelService,
		chatMessageService: ChatMessageService,
		databaseService: DatabaseService,
		dialogService: DialogService,
		envService: EnvService,
		localStorageService: LocalStorageService,
		notificationService: NotificationService,
		p2pWebRTCService: P2PWebRTCService,
		potassiumService: PotassiumService,
		qrService: QRService,
		scrollService: ScrollService,
		sessionService: SessionService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService,

		/** @ignore */
		private readonly accountSessionInitService: AccountSessionInitService
	) {
		super(
			accountSettingsService,
			analyticsService,
			castleService,
			channelService,
			chatMessageService,
			databaseService,
			dialogService,
			envService,
			localStorageService,
			notificationService,
			p2pWebRTCService,
			potassiumService,
			qrService,
			scrollService,
			sessionService,
			sessionInitService,
			stringsService
		);
	}
}
