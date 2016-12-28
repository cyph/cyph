import {analytics} from '../../analytics';
import {env} from '../../env';
import {events, rpcEvents, users} from '../../session/enums';
import {ISession} from '../../session/isession';
import {Message} from '../../session/message';
import {ThreadedSession} from '../../session/threadedsession';
import {strings} from '../../strings';
import {Timer} from '../../timer';
import {urlState} from '../../urlstate';
import {util} from '../../util';
import {DialogManager} from '../dialogmanager';
import {elements, Elements} from '../elements';
import {nanoScroller} from '../nanoscroller';
import {Notifier} from '../notifier';
import {Cyphertext} from './cyphertext';
import {States} from './enums';
import {FileManager} from './filemanager';
import {IChatMessage} from './ichatmessage';
import {IElements} from './ielements';
import {P2PManager} from './p2pmanager';
import {ScrollManager} from './scrollmanager';


/**
 * This is the entire end-to-end representation of a cyph.
 */
export class Chat {
	/** @ignore */
	private static readonly approximateKeyExchangeTime: number			= 15000;

	/** @ignore */
	private static readonly queuedMessageSelfDestructTimeout: number	= 15000;


	/** @ignore */
	private isMessageChanged: boolean	= false;

	/** @ignore */
	private readonly elements: IElements;

	/** @ignore */
	private previousMessage: string;

	/** @ignore */
	private queuedMessage: string;

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

	/** Message list. */
	public readonly messages: IChatMessage[]	= [];

	/** @see Cyphertext */
	public readonly cyphertext: Cyphertext;

	/** @see FileManager */
	public readonly fileManager: FileManager;

	/** @see P2PManager */
	public readonly p2pManager: P2PManager;

	/** @see ScrollManager */
	public readonly scrollManager: ScrollManager;

	/** @see ISession */
	public readonly session: ISession;

	/** @ignore */
	private findElement (selector: string) : () => JQuery {
		return Elements.getElement(() => this.rootElement.find(selector));
	}

	/** Begins chat. */
	private async begin () : Promise<void> {
		if (this.state === States.aborted) {
			return;
		}

		/* Workaround for Safari bug that breaks initiating a new chat */
		this.session.sendBase([]);

		if (this.notifier) {
			this.notifier.notify(strings.connectedNotification);
		}

		this.state	= States.chatBeginMessage;

		await util.sleep(3000);

		if (<States> this.state === States.aborted) {
			return;
		}

		this.session.trigger(events.beginChatComplete);

		this.state	= States.chat;

		this.addMessage(
			strings.introductoryMessage,
			users.app,
			util.timestamp() - 30000,
			false
		);

		this.isConnected	= true;

		if (this.queuedMessage) {
			this.send(
				this.queuedMessage,
				this.queuedMessageSelfDestruct ?
					Chat.queuedMessageSelfDestructTimeout :
					undefined
			);
		}
	}

	/** This kills the chat. */
	private close () : void {
		if (this.state === States.aborted) {
			return;
		}

		this.setFriendTyping(false);

		if (!this.isConnected) {
			this.abortSetup();
		}
		else if (!this.isDisconnected) {
			this.isDisconnected	= true;
			this.addMessage(strings.disconnectNotification, users.app);
			this.session.close();
		}
	}

	/** Aborts the process of chat initialisation and authentication. */
	public abortSetup () : void {
		this.state	= States.aborted;
		this.session.trigger(events.abort);
		this.session.close();
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
		shouldNotify: boolean = author !== users.me,
		selfDestructTimeout?: number
	) : Promise<void> {
		if (this.state === States.aborted || !text || typeof text !== 'string') {
			return;
		}

		while (author !== users.app && !this.isConnected) {
			await util.sleep(500);
		}

		if (this.notifier && shouldNotify !== false) {
			if (author === users.app) {
				this.notifier.notify(text);
			}
			else {
				this.notifier.notify(strings.newMessageNotification);
			}
		}

		const message: IChatMessage	= {
			author,
			text,
			timestamp,
			timeString: util.getTimeString(timestamp),
			unread: author !== users.app && author !== users.me
		};

		this.messages.push(message);
		this.messages.sort((a, b) => a.timestamp - b.timestamp);

		this.scrollManager.scrollDown(true);

		if (author === users.me) {
			this.scrollManager.scrollDown();
		}
		else {
			nanoScroller.update();
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

	/** After confirmation dialog, this kills the chat. */
	public async disconnectButton () : Promise<void> {
		if (await this.dialogManager.confirm({
			cancel: strings.cancel,
			content: strings.disconnectConfirm,
			ok: strings.continueDialogAction,
			title: strings.disconnectTitle
		})) {
			this.close();
		}
	}

	/** Displays help information. */
	public helpButton () : void {
		this.dialogManager.baseDialog({
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
			this.session.send(
				new Message(
					rpcEvents.typing,
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
			this.session.sendText(message, selfDestructTimeout);
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
			this.dialogManager.toast({
				content: strings.queuedMessageSaved,
				delay: 2500
			});
		}
		if (typeof selfDestruct === 'boolean') {
			this.queuedMessageSelfDestruct	= selfDestruct;
		}
	}

	/**
	 * @param dialogManager
	 * @param notifier
	 * @param messageCountInTitle
	 * @param isMobile
	 * @param session If not specified, one will be created.
	 * @param rootElement
	 */
	constructor (
		/** @ignore */
		private readonly dialogManager: DialogManager,

		/** @ignore */
		private readonly notifier?: Notifier,

		messageCountInTitle?: boolean,

		/** Indicates whether the mobile chat UI is to be displayed. */
		public readonly isMobile: boolean = env.isMobile,

		session?: ISession,

		/** @ignore */
		private readonly rootElement: JQuery = elements.html()
	) {
		this.elements	= {
			cyphertext: this.findElement(elements.cyphertext().selector),
			everything: this.findElement(elements.everything().selector),
			messageList: this.findElement(elements.messageList().selector),
			messageListInner: this.findElement(elements.messageListInner().selector),
			p2pFriendStream: this.findElement(elements.p2pFriendStream().selector),
			p2pMeStream: this.findElement(elements.p2pMeStream().selector),
			title: this.findElement(elements.title().selector)
		};

		let forceTURN		= false;
		let nativeCrypto	= false;

		if (session) {
			this.session	= session;
		}
		else {
			const newUrlState: string[]	= urlState.getUrlSplit();
			let id: string				= newUrlState.slice(-1)[0];

			urlState.setUrl(newUrlState.slice(0, -1).join(''), true, true);

			/* Modest branding API flag */
			if (id[0] === '&') {
				id	=
					id.substring(1) +
					(id.length > 1 ? 'a' : '')
				;

				this.rootElement.addClass('modest');

				analytics.sendEvent({
					eventAction: 'used',
					eventCategory: 'modest-branding',
					eventValue: 1,
					hitType: 'event'
				});
			}

			/* Force TURN API flag */
			if (id[0] === '$') {
				id	=
					id.substring(1) +
					(id.length > 1 ? 'a' : '')
				;

				forceTURN	= true;

				analytics.sendEvent({
					eventAction: 'used',
					eventCategory: 'force-turn',
					eventValue: 1,
					hitType: 'event'
				});
			}

			/* Native crypto API flag */
			if (id[0] === '%') {
				id	=
					id.substring(1) +
					(id.length > 1 ? 'a' : '')
				;

				nativeCrypto	= true;

				analytics.sendEvent({
					eventAction: 'used',
					eventCategory: 'native-crypto',
					eventValue: 1,
					hitType: 'event'
				});
			}

			this.session	= new ThreadedSession(
				id,
				nativeCrypto
			);
		}

		this.cyphertext		= new Cyphertext(
			this.session,
			this.dialogManager,
			this.isMobile,
			this.elements
		);

		this.p2pManager		= new P2PManager(
			this,
			this.dialogManager,
			this.elements,
			forceTURN
		);

		this.fileManager	= new FileManager(
			this,
			this.dialogManager
		);

		this.scrollManager	= new ScrollManager(
			this,
			this.elements,
			messageCountInTitle
		);

		/* Temporary workaround pending TypeScript fix. */
		/* tslint:disable-next-line:ban  */
		setTimeout(async () => {
			while (true) {
				await util.sleep(5000);
				this.messageChange();
			}
		});

		(<any> self).tabIndent.renderAll();

		this.session.one(events.beginChat).then(() => { this.begin(); });

		this.session.one(events.closeChat).then(() => { this.close(); });

		this.session.one(events.connect).then(async () => {
			this.state	= States.keyExchange;

			const interval		= 250;
			const increment		= interval / Chat.approximateKeyExchangeTime;

			while (this.keyExchangeProgress <= 100) {
				await util.sleep(interval);
				this.keyExchangeProgress += increment * 100;
			}

			this.keyExchangeProgress	= 100;
		});

		this.session.one(events.connectFailure).then(() => { this.abortSetup(); });

		this.session.on(rpcEvents.text, (o: {
			text: string;
			author: string;
			timestamp: number;
			selfDestructTimeout?: number;
		}) => { this.addMessage(
			o.text,
			o.author,
			o.timestamp,
			undefined,
			o.selfDestructTimeout
		); });

		this.session.on(rpcEvents.typing, (o: {isTyping: boolean}) => {
			this.setFriendTyping(o.isTyping);
		});
	}
}
