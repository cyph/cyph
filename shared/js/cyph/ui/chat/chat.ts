import {analytics} from '../../analytics';
import {env} from '../../env';
import {ITimer} from '../../itimer';
import {events, rpcEvents, users} from '../../session/enums';
import {ISession} from '../../session/isession';
import {Message} from '../../session/message';
import {ThreadedSession} from '../../session/threadedsession';
import {strings} from '../../strings';
import {Timer} from '../../timer';
import {urlState} from '../../urlstate';
import {util} from '../../util';
import {BaseButtonManager} from '../basebuttonmanager';
import {elements, Elements} from '../elements';
import {IDialogManager} from '../idialogmanager';
import {INotifier} from '../inotifier';
import {ISidebar} from '../isidebar';
import {nanoScroller} from '../nanoscroller';
import {Cyphertext} from './cyphertext';
import {States} from './enums';
import {FileManager} from './filemanager';
import {IChat} from './ichat';
import {ICyphertext} from './icyphertext';
import {IElements} from './ielements';
import {IFileManager} from './ifilemanager';
import {IP2PManager} from './ip2pmanager';
import {IScrollManager} from './iscrollmanager';
import {P2PManager} from './p2pmanager';
import {ScrollManager} from './scrollmanager';


/** @inheritDoc */
export class Chat extends BaseButtonManager implements IChat {
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

	/** @inheritDoc */
	public isConnected: boolean					= false;

	/** @inheritDoc */
	public isDisconnected: boolean				= false;

	/** @inheritDoc */
	public isFriendTyping: boolean				= false;

	/** @inheritDoc */
	public queuedMessageSelfDestruct: boolean	= false;

	/** @inheritDoc */
	public currentMessage: string				= '';

	/** @inheritDoc */
	public keyExchangeProgress: number			= 0;

	/** @inheritDoc */
	public state: States						= States.none;

	/** @inheritDoc */
	public readonly messages: {
		author: string;
		selfDestructTimer: ITimer;
		text: string;
		timestamp: number;
		timeString: string;
		unread: boolean;
	}[]	= [];

	/** @inheritDoc */
	public readonly cyphertext: ICyphertext;

	/** @inheritDoc */
	public readonly fileManager: IFileManager;

	/** @inheritDoc */
	public readonly p2pManager: IP2PManager;

	/** @inheritDoc */
	public readonly scrollManager: IScrollManager;

	/** @inheritDoc */
	public readonly session: ISession;

	/** @ignore */
	private findElement (selector: string) : () => JQuery {
		return Elements.get(() => this.rootElement.find(selector));
	}

	/** @inheritDoc */
	public abortSetup () : void {
		this.changeState(States.aborted);
		this.session.trigger(events.abort);
		this.session.close();
	}

	/** @inheritDoc */
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

		if (shouldNotify !== false) {
			if (author === users.app) {
				this.notifier.notify(text);
			}
			else {
				this.notifier.notify(strings.newMessageNotification);
			}
		}

		const message	= {
			author,
			text,
			timestamp,
			selfDestructTimer: <ITimer> null,
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

		if (!isNaN(selfDestructTimeout) && selfDestructTimeout > 0) {
			message.selfDestructTimer	= new Timer(selfDestructTimeout);
			await message.selfDestructTimer.start();
			await util.sleep(10000);
			message.text	= null;
		}
	}

	/** @inheritDoc */
	public async begin () : Promise<void> {
		if (this.state === States.aborted) {
			return;
		}

		this.notifier.notify(strings.connectedNotification);
		this.changeState(States.chatBeginMessage);

		await util.sleep(3000);

		if (<States> this.state === States.aborted) {
			return;
		}

		this.session.trigger(events.beginChatComplete);
		this.changeState(States.chat);
		this.addMessage(
			strings.introductoryMessage,
			users.app,
			util.timestamp() - 30000,
			false
		);
		this.setConnected();

		if (this.queuedMessage) {
			this.send(
				this.queuedMessage,
				this.queuedMessageSelfDestruct ?
					Chat.queuedMessageSelfDestructTimeout :
					undefined
			);
		}
	}

	/** @inheritDoc */
	public changeState (state: States) : void {
		this.state	= state;
	}

	/** @inheritDoc */
	public close () : void {
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

	/** @inheritDoc */
	public disconnectButton () : void {
		this.baseButtonClick(async () => {
			if (await this.dialogManager.confirm({
				cancel: strings.cancel,
				content: strings.disconnectConfirm,
				ok: strings.continueDialogAction,
				title: strings.disconnectTitle
			})) {
				this.close();
			}
		});
	}

	/** @inheritDoc */
	public helpButton () : void {
		this.baseButtonClick(() => {
			this.dialogManager.baseDialog({
				template: `<md-dialog class='full'><cyph-help></cyph-help></md-dialog>`
			});

			analytics.send({
				eventAction: 'show',
				eventCategory: 'help',
				eventValue: 1,
				hitType: 'event'
			});
		});
	}

	/** @inheritDoc */
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

	/** @inheritDoc */
	public send (message?: string, selfDestructTimeout?: number) : void {
		if (!message) {
			message	= this.currentMessage;

			this.currentMessage	= '';

			this.messageChange();
		}

		if (message) {
			this.session.sendText(message, selfDestructTimeout);
		}
	}

	/** @inheritDoc */
	public setConnected () : void {
		this.isConnected	= true;
	}

	/** @inheritDoc */
	public setFriendTyping (isFriendTyping: boolean) : void {
		this.isFriendTyping	= isFriendTyping;
	}

	/** @inheritDoc */
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
	 * @param mobileMenu
	 * @param notifier
	 * @param messageCountInTitle
	 * @param isMobile
	 * @param session If not specified, one will be created.
	 * @param rootElement
	 */
	constructor (
		/** @ignore */
		private readonly dialogManager: IDialogManager,

		mobileMenu: () => ISidebar,

		/** @ignore */
		private readonly notifier: INotifier,

		messageCountInTitle?: boolean,

		/** @ignore */
		public readonly isMobile: boolean = env.isMobile,

		session?: ISession,

		/** @ignore */
		private readonly rootElement: JQuery = elements.html()
	) {
		super(mobileMenu);

		this.elements	= {
			buttons: this.findElement(elements.buttons().selector),
			cyphertext: this.findElement(elements.cyphertext().selector),
			everything: this.findElement(elements.everything().selector),
			messageBox: this.findElement(elements.messageBox().selector),
			messageList: this.findElement(elements.messageList().selector),
			messageListInner: this.findElement(elements.messageListInner().selector),
			p2pFriendPlaceholder: this.findElement(elements.p2pFriendPlaceholder().selector),
			p2pFriendStream: this.findElement(elements.p2pFriendStream().selector),
			p2pMeStream: this.findElement(elements.p2pMeStream().selector),
			title: this.findElement(elements.title().selector)
		};

		let forceTURN: boolean;
		let nativeCrypto: boolean;

		if (session) {
			this.session	= session;
		}
		else {
			const newUrlState: string[]	= urlState.getSplit();
			let id: string				= newUrlState.slice(-1)[0];

			urlState.set(newUrlState.slice(0, -1).join(''), true, true);

			/* Modest branding API flag */
			if (id[0] === '&') {
				id	=
					id.substring(1) +
					(id.length > 1 ? 'a' : '')
				;

				this.rootElement.addClass('modest');

				analytics.send({
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

				analytics.send({
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

				analytics.send({
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
			this.mobileMenu,
			this.dialogManager,
			this.isMobile,
			this.elements
		);

		this.p2pManager		= new P2PManager(
			this,
			this.mobileMenu,
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


		setInterval(() => this.messageChange(), 5000);

		(<any> self).tabIndent.renderAll();


		this.session.one(events.beginChat).then(async () => this.begin());

		this.session.one(events.closeChat).then(() => this.close());

		this.session.one(events.connect).then(async () => {
			this.changeState(States.keyExchange);

			const interval		= 250;
			const increment		= interval / Chat.approximateKeyExchangeTime;

			while (this.keyExchangeProgress <= 100) {
				await util.sleep(interval);
				this.keyExchangeProgress += increment * 100;
			}

			this.keyExchangeProgress	= 100;
		});

		this.session.one(events.connectFailure).then(() => this.abortSetup());

		this.session.on(rpcEvents.text, async (o: {
			text: string;
			author: string;
			timestamp: number;
			selfDestructTimeout?: number;
		}) =>
			this.addMessage(
				o.text,
				o.author,
				o.timestamp,
				undefined,
				o.selfDestructTimeout
			)
		);

		this.session.on(rpcEvents.typing, (o: {isTyping: boolean}) =>
			this.setFriendTyping(o.isTyping)
		);
	}
}
