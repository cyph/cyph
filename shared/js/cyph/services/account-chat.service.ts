import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {take} from 'rxjs/operators/take';
import {IChatData, States} from '../chat';
import {ChatMessage, ChatMessageValue, ChatUnconfirmedMessagesProto} from '../proto';
import {getOrSetDefault} from '../util/get-or-set-default';
import {AccountContactsService} from './account-contacts.service';
import {AccountSessionService} from './account-session.service';
import {AnalyticsService} from './analytics.service';
import {ChatService} from './chat.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DialogService} from './dialog.service';
import {NotificationService} from './notification.service';
import {ScrollService} from './scroll.service';
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

	/** Sets the remote user we're chatting with. */
	public async setUser (username: string, keepCurrentMessage: boolean = false) : Promise<void> {
		const contactURL	= `contacts/${await this.accountContactsService.addContact(username)}`;

		await this.accountSessionService.setUser(username);

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
			noKeyExchangeState: true,
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
		scrollService: ScrollService,
		sessionService: SessionService,
		stringsService: StringsService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService
	) {
		super(
			analyticsService,
			dialogService,
			notificationService,
			scrollService,
			sessionService,
			stringsService
		);
	}
}
