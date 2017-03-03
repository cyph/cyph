import {Injectable} from '@angular/core';
import {analytics} from '../analytics';
import {States} from '../chat/enums';
import {IChatMessage} from '../chat/ichat-message';
import {Message} from '../session/message';
import {Timer} from '../timer';
import {util} from '../util';
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
	private static readonly approximateKeyExchangeTime: number			= 15000;

	/** @ignore */
	private static readonly queuedMessageSelfDestructTimeout: number	= 15000;


	/** @ignore */
	private previousMessage: string;

	/** @ignore */
	private queuedMessage: string;

	/** @ignore */
	private isMessageChanged: boolean	= false;

	/** Indicates whether authentication has completed (still true even after disconnect). */
	public isConnected: boolean					= false;

	/** Indicates whether chat has been disconnected. */
	public isDisconnected: boolean				= false;

	/** Indicates whether the other party is typing. */
	public isFriendTyping: boolean				= false;

	/** Indicates whether the queued message is self-destructing. */
	public queuedMessageSelfDestruct: boolean	= false;

	/** The current message being composed. */
	public currentMessage: string				= '';

	/** Percentage complete with initial handshake (approximate / faked out). */
	public keyExchangeProgress: number			= 0;

	/** Chat UI state/view. */
	public state: States						= States.none;

	/** @see States */
	public readonly states: typeof States		= States;

	/** Message list. */
	public readonly messages: IChatMessage[]	= [];

	/** This kills the chat. */
	private close () : void {
		if (this.state === States.aborted) {
			return;
		}

		this.setFriendTyping(false);
		this.scrollService.scrollDown();

		if (!this.isConnected) {
			this.abortSetup();
		}
		else if (!this.isDisconnected) {
			this.isDisconnected	= true;
			this.addMessage(
				this.stringsService.disconnectNotification,
				this.sessionService.users.app
			);
			this.sessionService.close();
		}
	}

	/** Aborts the process of chat initialisation and authentication. */
	public abortSetup () : void {
		this.state	= States.aborted;
		this.sessionService.trigger(this.sessionService.events.abort);
		this.sessionService.close();
	}

	/**
	 * Adds a message to the chat.
	 * @param text
	 * @param author
	 * @param timestamp If not set, will use Util.timestamp().
	 * @param shouldNotify If true, a notification will be sent.
	 * @param selfDestructTimeout
	 */
	public async addMessage (
		text: string,
		author: string,
		timestamp: number = util.timestamp(),
		shouldNotify: boolean = author !== this.sessionService.users.me,
		selfDestructTimeout?: number
	) : Promise<void> {
		if (this.state === States.aborted || this.isDisconnected || !text) {
			return;
		}

		while (author !== this.sessionService.users.app && !this.isConnected) {
			await util.sleep(500);
		}

		if (this.notificationService && shouldNotify) {
			if (author === this.sessionService.users.app) {
				this.notificationService.notify(text);
			}
			else {
				this.notificationService.notify(this.stringsService.newMessageNotification);
			}
		}

		const message: IChatMessage	= {
			author,
			text,
			timestamp,
			timeString: util.getTimeString(timestamp),
			unread:
				author !== this.sessionService.users.app &&
				author !== this.sessionService.users.me
		};

		this.messages.push(message);
		this.messages.sort((a, b) => a.timestamp - b.timestamp);

		if (author === this.sessionService.users.me) {
			this.scrollService.scrollDown();
		}

		if (
			selfDestructTimeout !== undefined &&
			!isNaN(selfDestructTimeout) &&
			selfDestructTimeout > 0
		) {
			message.selfDestructTimer	= new Timer(selfDestructTimeout);
			await message.selfDestructTimer.start();
			await util.sleep(10000);
			message.text	= undefined;
		}
	}

	/** Begins chat. */
	public async begin () : Promise<void> {
		if (this.state === States.aborted) {
			return;
		}

		/* Workaround for Safari bug that breaks initiating a new chat */
		this.sessionService.send(...[]);

		if (this.notificationService) {
			this.notificationService.notify(this.stringsService.connectedNotification);
		}

		this.state	= States.chatBeginMessage;

		await util.sleep(3000);

		if (<States> this.state === States.aborted) {
			return;
		}

		this.sessionService.trigger(this.sessionService.events.beginChatComplete);

		this.state	= States.chat;

		this.addMessage(
			this.stringsService.introductoryMessage,
			this.sessionService.users.app,
			util.timestamp() - 30000,
			false
		);

		this.isConnected	= true;

		if (this.queuedMessage) {
			this.send(
				this.queuedMessage,
				this.queuedMessageSelfDestruct ?
					ChatService.queuedMessageSelfDestructTimeout :
					undefined
			);
		}
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
		this.dialogService.baseDialog({
			template: `<md-dialog class='full'><cyph-help></cyph-help></md-dialog>`
		});

		analytics.sendEvent({
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
	public messageChange () : void {
		const isMessageChanged: boolean	=
			this.currentMessage !== '' &&
			this.currentMessage !== this.previousMessage
		;

		this.previousMessage	= this.currentMessage;

		if (this.isMessageChanged !== isMessageChanged) {
			this.isMessageChanged	= isMessageChanged;
			this.sessionService.send(
				new Message(
					this.sessionService.rpcEvents.typing,
					{isTyping: this.isMessageChanged}
				)
			);
		}
	}

	/**
	 * Sends a message.
	 * @param message
	 * @param selfDestructTimeout
	 */
	public send (message?: string, selfDestructTimeout?: number) : void {
		if (!message) {
			message				= this.currentMessage;
			this.currentMessage	= '';
			this.messageChange();
		}

		if (message) {
			this.sessionService.send(new Message(this.sessionService.rpcEvents.text, {
				selfDestructTimeout,
				text: message
			}));
		}
	}

	/**
	 * Sets this.isFriendTyping to isFriendTyping.
	 * @param isFriendTyping
	 */
	public setFriendTyping (isFriendTyping: boolean) : void {
		this.isFriendTyping	= isFriendTyping;
	}

	/**
	 * Sets queued message to be sent after handshake.
	 * @param messageText
	 * @param selfDestruct
	 */
	public setQueuedMessage (messageText?: string, selfDestruct?: boolean) : void {
		if (typeof messageText === 'string') {
			this.queuedMessage	= messageText;
			this.dialogService.toast({
				content: this.stringsService.queuedMessageSaved,
				delay: 2500
			});
		}
		if (typeof selfDestruct === 'boolean') {
			this.queuedMessageSelfDestruct	= selfDestruct;
		}
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly notificationService: NotificationService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		/* Temporary workaround pending TypeScript fix. */
		/* tslint:disable-next-line:ban  */
		setTimeout(async () => {
			while (true) {
				await util.sleep(5000);
				this.messageChange();
			}
		});

		this.sessionService.one(this.sessionService.events.beginChat).then(() => {
			this.begin();
		});

		this.sessionService.one(this.sessionService.events.closeChat).then(() => {
			this.close();
		});

		this.sessionService.one(this.sessionService.events.connect).then(async () => {
			this.state	= States.keyExchange;

			const interval		= 250;
			const increment		= interval / ChatService.approximateKeyExchangeTime;

			while (this.keyExchangeProgress <= 100) {
				await util.sleep(interval);
				this.keyExchangeProgress += increment * 100;
			}

			this.keyExchangeProgress	= 100;
		});

		this.sessionService.one(this.sessionService.events.connectFailure).then(() => {
			this.abortSetup();
		});

		this.sessionService.on(this.sessionService.rpcEvents.text, (o: {
			author: string;
			text?: string;
			timestamp: number;
			selfDestructTimeout?: number;
		}) => {
			if (typeof o.text !== 'string') {
				return;
			}

			this.addMessage(
				o.text,
				o.author,
				o.timestamp,
				undefined,
				o.selfDestructTimeout
			);
		});

		this.sessionService.on(this.sessionService.rpcEvents.typing, (o: {isTyping: boolean}) => {
			this.setFriendTyping(o.isTyping);
		});
	}
}
