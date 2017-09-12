import {Injectable, Injector} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {ChatMessage} from '../../proto';
import {IChatData, States} from '../chat';
import {ChatUnconfirmedMessagesProto} from '../protos';
import {util} from '../util';
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

	/** Sets the remote user we're chatting with. */
	public async setUser (username: string) : Promise<void> {
		username	= util.normalize(username);

		const contactURL	=
			`contacts/${await this.accountContactsService.getContactID(username)}`
		;

		await this.accountSessionService.setUser(username);

		this.chat	= util.getOrSetDefault(this.chats, username, () => ({
			currentMessage: '',
			isConnected: true,
			isDisconnected: false,
			isFriendTyping: new BehaviorSubject(false),
			isMessageChanged: false,
			keyExchangeProgress: 0,
			messages: this.accountDatabaseService.getAsyncList(
				`${contactURL}/messages`,
				ChatMessage
			),
			noKeyExchangeState: true,
			queuedMessageSelfDestruct: false,
			state: States.chat,
			unconfirmedMessages: this.accountDatabaseService.getAsyncValue(
				`${contactURL}/unconfirmedMessages`,
				ChatUnconfirmedMessagesProto
			)
		}));
	}

	constructor (
		injector: Injector,
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
			injector,
			analyticsService,
			dialogService,
			notificationService,
			scrollService,
			sessionService,
			stringsService
		);
	}
}
