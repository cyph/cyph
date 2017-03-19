import {Injectable} from '@angular/core';
import {IChatData, States} from '../chat';
import {users} from '../session/enums';
import {AccountSessionService} from './account-session.service';
import {ChatService} from './chat.service';
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
		if (
			this.accountSessionService.user &&
			username === this.accountSessionService.user.username
		) {
			return;
		}

		await this.accountSessionService.setUser(username);

		const chat	= this.chats.get(username);

		if (chat) {
			this.chat	= chat;
		}
		else {
			this.chat	= {
				currentMessage: '',
				isConnected: true,
				isDisconnected: false,
				isFriendTyping: false,
				isMessageChanged: false,
				keyExchangeProgress: 0,
				messages: [],
				queuedMessageSelfDestruct: false,
				state: States.chat
			};

			this.chats.set(username, this.chat);

			this.addMessage(
				this.stringsService.introductoryMessage,
				users.app,
				undefined,
				false
			);
		}
	}

	constructor (
		dialogService: DialogService,
		notificationService: NotificationService,
		scrollService: ScrollService,
		sessionService: SessionService,
		stringsService: StringsService,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService
	) {
		super(
			dialogService,
			notificationService,
			scrollService,
			sessionService,
			stringsService
		);
	}
}
