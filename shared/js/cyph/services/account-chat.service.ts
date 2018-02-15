import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {take} from 'rxjs/operators/take';
import {IChatData, IChatMessageLiveValue, States} from '../chat';
import {
	ChatMessage,
	ChatMessageValue,
	ChatUnconfirmedMessagesProto,
	NotificationTypes
} from '../proto';
import {getOrSetDefault} from '../util/get-or-set-default';
import {AccountContactsService} from './account-contacts.service';
import {AccountSessionInitService} from './account-session-init.service';
import {AccountSessionService} from './account-session.service';
import {AnalyticsService} from './analytics.service';
import {ChatService} from './chat.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {NotificationService} from './notification.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
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
	private readonly chats	= new Map<string, IChatData>();

	/** @inheritDoc */
	protected async getAuthorID (author: Observable<string>) : Promise<string|undefined> {
		return (
			author === this.sessionService.appUsername ||
			author === this.sessionService.localUsername
		) ?
			undefined :
			(async () =>
				this.accountContactsService.getContactID(await author.pipe(take(1)).toPromise())
			)().catch(
				() => undefined
			)
		;
	}

	/** @inheritDoc */
	public async send (
		messageType?: ChatMessageValue.Types,
		message?: IChatMessageLiveValue,
		selfDestructTimeout?: number,
		selfDestructChat?: boolean,
		keepCurrentMessage?: boolean
	) : Promise<void> {
		await super.send(
			messageType,
			message,
			selfDestructTimeout,
			selfDestructChat,
			keepCurrentMessage
		);

		if (!this.accountSessionService.remoteUser.value) {
			return;
		}

		await this.accountDatabaseService.notify(
			this.accountSessionService.remoteUser.value.username,
			NotificationTypes.Message
		);
	}

	/** Sets the remote user we're chatting with. */
	public async setUser (
		username: string,
		keepCurrentMessage: boolean = false,
		callType?: 'audio'|'video',
		sessionSubID?: string
	) : Promise<void> {
		const contactURL	= `contacts/${await this.accountContactsService.addContact(username)}`;

		this.accountSessionInitService.callType	= callType || this.envService.callType;

		await this.accountSessionService.setUser(username, sessionSubID);

		this.chat	= getOrSetDefault(this.chats, username, () => ({
			currentMessage: keepCurrentMessage ? this.chat.currentMessage : {},
			isConnected: true,
			isDisconnected: false,
			isFriendTyping: new BehaviorSubject(false),
			isMessageChanged: false,
			keyExchangeProgress: 0,
			messages: this.accountDatabaseService.getAsyncList(
				`${contactURL}/messages`,
				ChatMessage
			),
			/* See https://github.com/palantir/tslint/issues/3541 */
			/* tslint:disable-next-line:object-literal-sort-keys */
			messageValues: this.accountDatabaseService.getAsyncMap(
				`${contactURL}/messageValues`,
				ChatMessageValue
			),
			receiveTextLock: this.accountDatabaseService.lockFunction(
				`${contactURL}/receiveTextLock`
			),
			state: States.chat,
			unconfirmedMessages: this.accountDatabaseService.getAsyncValue(
				`${contactURL}/unconfirmedMessages`,
				ChatUnconfirmedMessagesProto
			)
		}));
	}

	constructor (
		analyticsService: AnalyticsService,
		dialogService: DialogService,
		notificationService: NotificationService,
		p2pWebRTCService: P2PWebRTCService,
		scrollService: ScrollService,
		sessionService: SessionService,
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
			dialogService,
			notificationService,
			p2pWebRTCService,
			scrollService,
			sessionService,
			sessionInitService,
			stringsService
		);
	}
}
