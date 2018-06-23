import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {SecurityModels} from '../account';
import {IChatData, IChatMessageLiveValue, States} from '../chat';
import {IAsyncSet} from '../iasync-set';
import {LocalAsyncList} from '../local-async-list';
import {
	ChatLastConfirmedMessage,
	ChatMessage,
	ChatMessageValue,
	IChatMessage,
	NeverProto,
	NotificationTypes,
	SessionMessageDataList,
	StringArrayProto
} from '../proto';
import {normalize} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {resolvable} from '../util/wait';
import {AccountContactsService} from './account-contacts.service';
import {AccountSessionInitService} from './account-session-init.service';
import {AccountSessionService} from './account-session.service';
import {AnalyticsService} from './analytics.service';
import {ChatService} from './chat.service';
import {AccountDatabaseService} from './crypto/account-database.service';
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
	private readonly chats				= new Map<string, IChatData>();

	/** @ignore */
	private readonly notificationData	= resolvable<{
		castleSessionID: string;
		usernames: string[];
	}>();

	/** @inheritDoc */
	protected async getAuthorID (author: Observable<string>) : Promise<string|undefined> {
		return (
			author === this.sessionService.appUsername ?
				undefined :
			author === this.sessionService.localUsername ?
				(await this.accountDatabaseService.getCurrentUser()).user.username :
				author.pipe(take(1)).toPromise().then(normalize).catch(() => undefined)
		);
	}

	/** Gets async set for scrollService.unreadMessages. */
	protected async getScrollServiceUnreadMessages () : Promise<IAsyncSet<string>> {
		const notificationData	= await this.notificationData.promise;

		const asyncMap			= this.accountDatabaseService.getAsyncMap(
			`unreadMessages/${notificationData.castleSessionID}`,
			NeverProto,
			SecurityModels.unprotected
		);

		return {
			addItem: async (_VALUE: string) => {},
			clear: async () => asyncMap.clear(),
			deleteItem: async (value: string) => asyncMap.removeItem(value),
			hasItem: async (value: string) => asyncMap.hasItem(value),
			size: async () => asyncMap.size(),
			watchSize: memoize(() => asyncMap.watchSize())
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
	) : Promise<string> {
		const id	= await super.send(
			messageType,
			message,
			selfDestructTimeout,
			selfDestructChat,
			keepCurrentMessage,
			oldLocalStorageKey
		);

		const notificationData	= await this.notificationData.promise;

		await Promise.all(notificationData.usernames.map(async username =>
			this.accountDatabaseService.notify(
				username,
				NotificationTypes.Message,
				{castleSessionID: notificationData.castleSessionID, id}
			)
		));

		return id;
	}

	/** Sets the remote user we're chatting with. */
	public async setUser (
		username: string|string[],
		keepCurrentMessage: boolean = false,
		callType?: 'audio'|'video',
		sessionSubID?: string,
		ephemeralSubSession: boolean = false
	) : Promise<void> {
		username				= this.accountSessionService.normalizeUsername(username);

		const notificationData	= {
			castleSessionID: await this.accountContactsService.getCastleSessionID(username),
			usernames: username instanceof Array ? username : [username]
		};

		this.notificationData.resolve(notificationData);

		const url	= `castleSessions/${notificationData.castleSessionID}`;

		this.accountSessionInitService.callType	= callType || this.envService.callType;

		this.chat	= ephemeralSubSession ?
			{
				...this.getDefaultChatData(),
				isConnected: true,
				state: States.chat
			} :
			getOrSetDefault(
				this.chats,
				username instanceof Array ? username.join(' ') : username,
				() => ({
					currentMessage: keepCurrentMessage ? this.chat.currentMessage : {},
					futureMessages: this.accountDatabaseService.getAsyncMap(
						`${url}/futureMessages`,
						SessionMessageDataList,
						undefined,
						undefined,
						undefined,
						true,
						true
					),
					initProgress: new BehaviorSubject(0),
					isConnected: true,
					isDisconnected: false,
					isFriendTyping: new BehaviorSubject(false),
					isMessageChanged: false,
					lastConfirmedMessage: this.accountDatabaseService.getAsyncValue(
						`${url}/lastConfirmedMessage`,
						ChatLastConfirmedMessage
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
						true,
						true
					),
					pendingMessageRoot: `${url}/pendingMessages`,
					pendingMessages: new LocalAsyncList<IChatMessage&{pending: true}>(),
					receiveTextLock: this.accountDatabaseService.lockFunction(
						`${url}/receiveTextLock`
					),
					state: States.chat,
					unconfirmedMessages:
						new BehaviorSubject<{[id: string]: boolean|undefined}|undefined>(
							undefined
						)
				})
			)
		;

		await this.accountSessionService.setUser(username, sessionSubID, ephemeralSubSession);
		this.resolvers.chatConnected.resolve();
	}

	constructor (
		analyticsService: AnalyticsService,
		databaseService: DatabaseService,
		dialogService: DialogService,
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
		private readonly accountSessionInitService: AccountSessionInitService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		super(
			analyticsService,
			databaseService,
			dialogService,
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
	}
}
