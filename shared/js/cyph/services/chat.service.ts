import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {ChatMessage, IChatMessage} from '../../proto';
import {IChatData, States} from '../chat';
import {HelpComponent} from '../components/help.component';
import {LocalAsyncList} from '../local-async-list';
import {LocalAsyncValue} from '../local-async-value';
import {LockFunction} from '../lock-function-type';
import {events, ISessionMessageData, rpcEvents} from '../session';
import {Timer} from '../timer';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {DialogService} from './dialog.service';
import {NotificationService} from './notification.service';
import {ScrollService} from './scroll.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Manages a chat.
 */
@Injectable()
export class ChatService {
	/** @ignore */
	private static readonly approximateKeyExchangeTime: number			= 18000;

	/** Time in seconds until chat self-destructs. */
	private chatSelfDestructTimeout: number								= 5;

	/** @ignore */
	private messageChangeLock: LockFunction								= util.lockFunction();

	/** @see IChatData */
	public chat: IChatData	= {
		currentMessage: '',
		isConnected: false,
		isDisconnected: false,
		isFriendTyping: new BehaviorSubject(false),
		isMessageChanged: false,
		keyExchangeProgress: 0,
		messages: new LocalAsyncList<IChatMessage>([]),
		receiveTextLock: util.lockFunction(),
		state: States.none,
		unconfirmedMessages: new LocalAsyncValue<{[id: string]: boolean|undefined}>({})
	};

	/** Indicates whether the chat is self-destructing. */
	public chatSelfDestruct: boolean									= false;

	/** Indicates whether the chat is self-destructed. */
	public chatSelfDestructed?: Observable<boolean>;

	/** Indicates whether the chat self-destruction effect should be running. */
	public chatSelfDestructEffect: boolean								= false;

	/** Timer for chat self-destruction. */
	public chatSelfDestructTimer?: Timer;

	/** Indicates whether the chat is ready to be displayed. */
	public initiated: boolean											= false;

	/** @ignore */
	private async addTextMessage (o: ISessionMessageData) : Promise<void> {
		if (!o.text) {
			return;
		}

		if (o.author === this.sessionService.localUsername) {
			await this.chat.unconfirmedMessages.updateValue(async unconfirmedMessages => {
				unconfirmedMessages[o.id]	= true;
				return unconfirmedMessages;
			});

			await util.sleep();
		}
		else {
			this.sessionService.send([rpcEvents.confirm, {textConfirmation: {id: o.id}}]);
		}

		const selfDestructChat	=
			o.text.selfDestructChat &&
			(
				o.text.selfDestructTimeout !== undefined &&
				!isNaN(o.text.selfDestructTimeout) &&
				o.text.selfDestructTimeout > 0
			) &&
			await (async () => {
				const messages	= await this.chat.messages.getValue();
				return messages.length === 0 || (
					messages.length === 1 &&
					messages[0].authorType === ChatMessage.AuthorTypes.App
				);
			})()
		;

		if (selfDestructChat) {
			this.chatSelfDestruct	= true;
			await this.chat.messages.updateValue(async () => []);
		}

		await this.addMessage(
			o.text.text,
			o.author,
			o.timestamp,
			undefined,
			selfDestructChat ? undefined : o.text.selfDestructTimeout,
			o.id
		);

		if (selfDestructChat) {
			this.chatSelfDestructed		=
				this.chat.messages.watch().map(messages => messages.length === 0)
			;
			this.chatSelfDestructTimer	= new Timer(this.chatSelfDestructTimeout * 1000);
			await this.chatSelfDestructTimer.start();
			this.chatSelfDestructEffect	= true;
			await util.sleep(500);
			await this.chat.messages.updateValue(async () => []);
			await util.sleep(1000);
			this.chatSelfDestructEffect	= false;

			if (o.author !== this.sessionService.localUsername) {
				await util.sleep(10000);
				this.close();
			}
		}
	}

	/** This kills the chat. */
	private close () : void {
		if (this.chat.state === States.aborted) {
			return;
		}

		this.chat.isFriendTyping.next(false);
		this.scrollService.scrollDown();

		if (!this.chat.isConnected) {
			this.abortSetup();
		}
		else if (!this.chat.isDisconnected) {
			this.chat.isDisconnected	= true;
			if (!this.chatSelfDestruct) {
				this.addMessage(this.stringsService.disconnectNotification);
			}
			this.sessionService.close();
		}
	}

	/** Gets author ID for including in message list item. */
	protected async getAuthorID (_AUTHOR: Observable<string>) : Promise<string|undefined> {
		return undefined;
	}

	/** Aborts the process of chat initialisation and authentication. */
	public abortSetup () : void {
		this.chat.state	= States.aborted;
		this.sessionService.trigger(events.abort);
		this.sessionService.close();
	}

	/**
	 * Adds a message to the chat.
	 * @param text
	 * @param author
	 * @param timestamp If not set, will use Util.timestamp().
	 * @param shouldNotify If true, a notification will be sent.
	 * @param selfDestructTimeout
	 * @param id
	 */
	public async addMessage (
		text: string,
		author: Observable<string> = this.sessionService.appUsername,
		timestamp?: number,
		shouldNotify: boolean = author !== this.sessionService.localUsername,
		selfDestructTimeout?: number,
		id: string = util.uuid()
	) : Promise<void> {
		if (
			!text ||
			this.chat.state === States.aborted ||
			(author !== this.sessionService.appUsername && this.chat.isDisconnected)
		) {
			return;
		}

		if (!timestamp) {
			timestamp	= await util.timestamp();
		}

		while (author !== this.sessionService.appUsername && !this.chat.isConnected) {
			await util.sleep(500);
		}

		if (this.notificationService && shouldNotify) {
			if (author === this.sessionService.appUsername) {
				this.notificationService.notify(text);
			}
			else {
				this.notificationService.notify(this.stringsService.newMessageNotification);
			}
		}

		await this.chat.messages.pushValue({
			authorID: await this.getAuthorID(author),
			authorType:
				author === this.sessionService.appUsername ?
					ChatMessage.AuthorTypes.App :
					author === this.sessionService.localUsername ?
						ChatMessage.AuthorTypes.Local :
						ChatMessage.AuthorTypes.Remote
			,
			id,
			selfDestructTimeout,
			text,
			timestamp
		});

		if (author === this.sessionService.localUsername) {
			this.scrollService.scrollDown();
		}

		if (
			selfDestructTimeout !== undefined &&
			!isNaN(selfDestructTimeout) &&
			selfDestructTimeout > 0
		) {
			await util.sleep(selfDestructTimeout + 10000);
			text	= '';

			await this.chat.messages.updateValue(async messages => {
				const i	= messages.findIndex(o => o.id === id);
				if (i >= 0) {
					messages.splice(i, 1);
				}
				return messages;
			});
		}
	}

	/** Begins chat. */
	public async begin () : Promise<void> {
		if (this.chat.state === States.aborted) {
			return;
		}

		/* Workaround for Safari bug that breaks initiating a new chat */
		this.sessionService.send(...[]);

		if (this.chat.queuedMessage) {
			this.send(
				this.chat.queuedMessage,
				this.chatSelfDestruct ?
					this.chatSelfDestructTimeout * 1000 :
					undefined,
				this.chatSelfDestruct
			);
		}

		if (this.notificationService) {
			this.notificationService.notify(this.stringsService.connectedNotification);
		}

		if (!this.chat.noKeyExchangeState) {
			this.chat.keyExchangeProgress	= 100;
			this.chat.state					= States.chatBeginMessage;

			await util.sleep(3000);

			if (<States> this.chat.state === States.aborted) {
				return;
			}

			this.sessionService.trigger(events.beginChatComplete);

			this.chat.state	= States.chat;

			for (let i = 0 ; i < 15 ; ++i) {
				if (this.chatSelfDestruct) {
					break;
				}
				await util.sleep(100);
			}

			if (!this.chatSelfDestruct) {
				this.addMessage(
					this.stringsService.introductoryMessage,
					undefined,
					(await util.timestamp()) - 30000,
					false
				);
			}

			this.initiated	= true;
		}

		this.chat.isConnected	= true;
	}

	/** After confirmation dialog, this kills the chat. */
	public async disconnectButton () : Promise<void> {
		if (await this.dialogService.confirm({
			cancel: this.stringsService.cancel,
			content: this.stringsService.disconnectConfirm,
			ok: this.stringsService.continueDialogAction,
			title: this.stringsService.disconnectTitle
		})) {
			this.close();
		}
	}

	/** Displays help information. */
	public helpButton () : void {
		this.dialogService.baseDialog(HelpComponent);

		this.analyticsService.sendEvent({
			eventAction: 'show',
			eventCategory: 'help',
			eventValue: 1,
			hitType: 'event'
		});
	}

	/**
	 * Checks for change to current message, and sends appropriate
	 * typing indicator signals through session.
	 */
	public async messageChange () : Promise<void> {
		return this.messageChangeLock(async () => {
			for (let i = 0 ; i < 2 ; ++i) {
				const isMessageChanged: boolean	=
					this.chat.currentMessage !== '' &&
					this.chat.currentMessage !== this.chat.previousMessage
				;

				this.chat.previousMessage	= this.chat.currentMessage;

				if (this.chat.isMessageChanged !== isMessageChanged) {
					this.chat.isMessageChanged	= isMessageChanged;
					this.sessionService.send([
						rpcEvents.typing,
						{chatState: {isTyping: this.chat.isMessageChanged}}
					]);

					await util.sleep(1000);
				}
			}
		});
	}

	/** Sends a message. */
	public async send (
		message?: string,
		selfDestructTimeout?: number,
		selfDestructChat: boolean = false
	) : Promise<void> {
		if (!message) {
			message						= this.chat.currentMessage;
			this.chat.currentMessage	= '';
			this.messageChange();
		}

		if (message) {
			this.addTextMessage((await this.sessionService.send([
				rpcEvents.text,
				{text: {selfDestructChat, selfDestructTimeout, text: message}}
			]))[0].data);
		}
	}

	/** Sets queued message to be sent after handshake. */
	public setQueuedMessage (messageText: string) : void {
		this.chat.queuedMessage	= messageText;
		this.dialogService.toast(this.stringsService.queuedMessageSaved, 2500);
	}

	constructor (
		/** @ignore */
		protected readonly analyticsService: AnalyticsService,

		/** @ignore */
		protected readonly dialogService: DialogService,

		/** @ignore */
		protected readonly notificationService: NotificationService,

		/** @ignore */
		protected readonly scrollService: ScrollService,

		/** @ignore */
		protected readonly sessionService: SessionService,

		/** @ignore */
		protected readonly stringsService: StringsService
	) {
		this.sessionService.one(events.beginChat).then(() => {
			this.begin();
		});

		this.sessionService.one(events.closeChat).then(() => {
			this.close();
		});

		this.sessionService.connected.then(async () => {
			if (this.chat.noKeyExchangeState) {
				return;
			}

			this.chat.state	= States.keyExchange;

			const interval		= 250;
			const increment		= interval / ChatService.approximateKeyExchangeTime;

			while (this.chat.keyExchangeProgress <= 100) {
				await util.sleep(interval);
				this.chat.keyExchangeProgress += increment * 100;
			}

			this.chat.keyExchangeProgress	= 100;
		});

		this.sessionService.one(events.connectFailure).then(() => {
			this.abortSetup();
		});

		this.sessionService.on(rpcEvents.confirm, (o: ISessionMessageData) => {
			if (!o.textConfirmation || !o.textConfirmation.id) {
				return;
			}

			const id	= o.textConfirmation.id;

			this.chat.unconfirmedMessages.updateValue(async unconfirmedMessages => {
				delete unconfirmedMessages[id];
				return unconfirmedMessages;
			});
		});

		this.sessionService.on(rpcEvents.typing, (o: ISessionMessageData) => {
			if (o.chatState) {
				this.chat.isFriendTyping.next(o.chatState.isTyping);
			}
		});

		this.chat.receiveTextLock(async () => {
			const f	= async (o: ISessionMessageData) => { this.addTextMessage(o); };
			this.sessionService.on(rpcEvents.text, f);
			await this.sessionService.closed;
			this.sessionService.off(rpcEvents.text, f);
		});
	}
}
