import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {map, mergeMap, take} from 'rxjs/operators';
import {SecurityModels} from '../account';
import {IChatData, IChatMessageLiveValue, States} from '../chat';
import {IAsyncSet} from '../iasync-set';
import {LocalAsyncList} from '../local-async-list';
import {
	ChatLastConfirmedMessage,
	ChatMessage,
	ChatMessageValue,
	IAccountMessagingGroup,
	IChatMessage,
	NeverProto,
	NotificationTypes,
	SessionMessageDataList,
	StringArrayProto,
	StringProto
} from '../proto';
import {normalize} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {uuid} from '../util/uuid';
import {resolvable} from '../util/wait';
import {reloadWindow} from '../util/window';
import {AccountContactsService} from './account-contacts.service';
import {AccountSessionCapabilitiesService} from './account-session-capabilities.service';
import {AccountSessionInitService} from './account-session-init.service';
import {AccountSessionService} from './account-session.service';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
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
import {ScrollService} from './scroll.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
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
		usernames: string[];
	}>();

	/** @inheritDoc */
	public readonly remoteUser = this.accountSessionService.remoteUser;

	/** @inheritDoc */
	public readonly remoteUserObservable = this.remoteUser.pipe(
		mergeMap(async user => user)
	);

	/** @inheritDoc */
	protected async getAuthorID (
		author: Observable<string>
	) : Promise<string | undefined> {
		return author === this.sessionService.appUsername ?
			undefined :
		author === this.sessionService.localUsername ?
			(await this.accountDatabaseService.getCurrentUser()).user.username :
			author
				.pipe(take(1))
				.toPromise()
				.then(normalize)
				.catch(() => undefined);
	}

	/** Gets async set for scrollService.unreadMessages. */
	protected async getScrollServiceUnreadMessages () : Promise<
		IAsyncSet<string>
	> {
		if (this.sessionInitService.ephemeral) {
			return super.getScrollServiceUnreadMessages();
		}

		const notificationData = await this.notificationData.promise;

		const asyncMap = this.accountDatabaseService.getAsyncMap(
			`unreadMessages/${notificationData.castleSessionID}`,
			NeverProto,
			SecurityModels.unprotected
		);

		const watch = memoize(() =>
			combineLatest([
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
			this.remoteUser.value
		]);

		if (!id || remoteUser?.anonymous) {
			return;
		}

		const notificationData = await this.notificationData.promise;

		await Promise.all(
			notificationData.usernames.map(async username =>
				this.accountDatabaseService.notify(
					username,
					NotificationTypes.Message,
					{castleSessionID: notificationData.castleSessionID, id}
				)
			)
		);

		return id;
	}

	/** Sets the remote user we're chatting with. */
	public async setUser (
		chat:
			| {anonymousChannelID: string; passive?: boolean}
			| {group: IAccountMessagingGroup}
			| {username: string},
		keepCurrentMessage: boolean = false,
		callType?: 'audio' | 'video',
		sessionSubID?: string,
		ephemeralSubSession: boolean = false
	) : Promise<void> {
		this.accountSessionInitService.callType =
			callType || this.envService.callType;

		if ('anonymousChannelID' in chat) {
			this.accountSessionCapabilitiesService.initEphemeral();
			await this.accountSessionService.setUser(chat);
			this.resolvers.chatConnected.resolve();
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
					castleSessionID: (await this.accountContactsService.getCastleSessionData(
						chat.username
					)).castleSessionID,
					usernames: [chat.username]
				} :
				{
					castleSessionID: chat.group.castleSessionID,
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
					'username' in chat ?
						chat.username :
						`group: ${chat.group.castleSessionID}`,
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
						lastConfirmedMessage: this.accountDatabaseService.getAsyncValue(
							`${url}/lastConfirmedMessage`,
							ChatLastConfirmedMessage
						),
						lastUnreadMessage: this.accountDatabaseService.getLatestKey(
							`unreadMessages/${notificationData.castleSessionID}`
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
						receiveTextLock: this.accountDatabaseService.lockFunction(
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
	}

	constructor (
		analyticsService: AnalyticsService,
		castleService: CastleService,
		channelService: ChannelService,
		databaseService: DatabaseService,
		dialogService: DialogService,
		envService: EnvService,
		localStorageService: LocalStorageService,
		notificationService: NotificationService,
		p2pWebRTCService: P2PWebRTCService,
		potassiumService: PotassiumService,
		scrollService: ScrollService,
		sessionService: SessionService,
		sessionCapabilitiesService: SessionCapabilitiesService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService,

		/** @ignore */
		private readonly accountSessionCapabilitiesService: AccountSessionCapabilitiesService,

		/** @ignore */
		private readonly accountSessionInitService: AccountSessionInitService
	) {
		super(
			analyticsService,
			castleService,
			channelService,
			databaseService,
			dialogService,
			envService,
			localStorageService,
			notificationService,
			p2pWebRTCService,
			potassiumService,
			scrollService,
			sessionService,
			sessionCapabilitiesService,
			sessionInitService,
			stringsService
		);

		/* For debugging */

		if (!this.envService.debug) {
			return;
		}

		(<any> self).resetSessionState = async () => {
			const remoteUser = await this.remoteUser.value;

			if (!remoteUser || !remoteUser.username) {
				return;
			}

			const {
				castleSessionURL
			} = await this.accountContactsService.getCastleSessionData(
				remoteUser.username
			);

			await this.databaseService.setItem(
				`${castleSessionURL}/id`,
				StringProto,
				uuid(true)
			);

			reloadWindow();
		};
	}
}
