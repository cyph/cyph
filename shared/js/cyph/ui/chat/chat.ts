import {Analytics} from '../../analytics';
import {Env} from '../../env';
import {ITimer} from '../../itimer';
import {Events, rpcEvents, Users} from '../../session/enums';
import {ISession} from '../../session/isession';
import {Message} from '../../session/message';
import {ThreadedSession} from '../../session/threadedsession';
import {Strings} from '../../strings';
import {Timer} from '../../timer';
import {UrlState} from '../../urlstate';
import {Util} from '../../util';
import {BaseButtonManager} from '../basebuttonmanager';
import {Elements} from '../elements';
import {IDialogManager} from '../idialogmanager';
import {INotifier} from '../inotifier';
import {ISidebar} from '../isidebar';
import {NanoScroller} from '../nanoscroller';
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
		this.session.trigger(Events.abort);
		this.session.close();
	}

	/** @inheritDoc */
	public async addMessage (
		text: string,
		author: string,
		timestamp: number = Util.timestamp(),
		shouldNotify: boolean = true,
		selfDestructTimeout?: number
	) : Promise<void> {
		if (this.state === States.aborted || !text || typeof text !== 'string') {
			return;
		}

		while (author !== Users.app && !this.isConnected) {
			await Util.sleep(500);
		}

		if (shouldNotify !== false) {
			if (author === Users.app) {
				this.notifier.notify(text);
			}
			else {
				this.notifier.notify(Strings.newMessageNotification);
			}
		}

		const message	= {
			author,
			text,
			timestamp,
			selfDestructTimer: <ITimer> null,
			timeString: Util.getTimeString(timestamp)
		};

		this.messages.push(message);
		this.messages.sort((a, b) => a.timestamp - b.timestamp);

		this.scrollManager.scrollDown(true);

		if (author === Users.me) {
			this.scrollManager.scrollDown();
		}
		else {
			NanoScroller.update();
		}

		if (!isNaN(selfDestructTimeout) && selfDestructTimeout > 0) {
			message.selfDestructTimer	= new Timer(selfDestructTimeout);
			await message.selfDestructTimer.start();
			await Util.sleep(10000);
			message.text	= null;
		}
	}

	/** @inheritDoc */
	public async begin () : Promise<void> {
		if (this.state === States.aborted) {
			return;
		}

		this.notifier.notify(Strings.connectedNotification);
		this.changeState(States.chatBeginMessage);

		await Util.sleep(3000);

		if (<States> this.state === States.aborted) {
			return;
		}

		this.session.trigger(Events.beginChatComplete);
		this.changeState(States.chat);
		this.addMessage(
			Strings.introductoryMessage,
			Users.app,
			Util.timestamp() - 30000,
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
			this.addMessage(Strings.disconnectNotification, Users.app);
			this.session.close();
		}
	}

	/** @inheritDoc */
	public disconnectButton () : void {
		this.baseButtonClick(async () => {
			if (await this.dialogManager.confirm({
				cancel: Strings.cancel,
				content: Strings.disconnectConfirm,
				ok: Strings.continueDialogAction,
				title: Strings.disconnectTitle
			})) {
				this.close();
			}
		});
	}

	/** @inheritDoc */
	public helpButton () : void {
		this.baseButtonClick(() => {
			this.dialogManager.baseDialog({
				templateUrl: '../../../../templates/helpmodal.html'
			});

			Analytics.send({
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
					this.isMessageChanged
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
			this.scrollManager.scrollDown();
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
				content: Strings.queuedMessageSaved,
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
		public readonly isMobile: boolean = Env.isMobile,

		session?: ISession,

		/** @ignore */
		private readonly rootElement: JQuery = Elements.html()
	) {
		super(mobileMenu);

		this.elements	= {
			buttons: this.findElement(Elements.buttons().selector),
			cyphertext: this.findElement(Elements.cyphertext().selector),
			everything: this.findElement(Elements.everything().selector),
			messageBox: this.findElement(Elements.messageBox().selector),
			messageList: this.findElement(Elements.messageList().selector),
			messageListInner: this.findElement(Elements.messageListInner().selector),
			p2pFriendPlaceholder: this.findElement(Elements.p2pFriendPlaceholder().selector),
			p2pFriendStream: this.findElement(Elements.p2pFriendStream().selector),
			p2pMeStream: this.findElement(Elements.p2pMeStream().selector),
			sendButton: this.findElement(Elements.sendButton().selector),
			title: this.findElement(Elements.title().selector)
		};

		let forceTURN: boolean;
		let nativeCrypto: boolean;

		if (session) {
			this.session	= session;
		}
		else {
			const urlState: string[]	= UrlState.getSplit();
			let id: string				= urlState.slice(-1)[0];

			UrlState.set(urlState.slice(0, -1).join(''), true, true);

			/* Modest branding API flag */
			if (id[0] === '&') {
				id	=
					id.substring(1) +
					(id.length > 1 ? 'a' : '')
				;

				this.rootElement.addClass('modest');

				Analytics.send({
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

				Analytics.send({
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

				Analytics.send({
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
			this.dialogManager,
			this.isMobile,
			this.elements,
			messageCountInTitle
		);


		if (this.isMobile) {
			/* Prevent jankiness upon message send on mobile */

			let lastClick	= 0;

			this.elements.messageBox().click(e => {
				const bounds	= (<any> this.elements.sendButton().filter(':visible')).bounds();

				if (
					(e.pageY > bounds.top && e.pageY < bounds.bottom) &&
					(e.pageX > bounds.left && e.pageX < bounds.right)
				) {
					const now: number	= Util.timestamp();

					if (now - lastClick > 500) {
						lastClick	= now;
						this.elements.sendButton().click();
					}
				}
			});
		}
		else {
			/* Adapt message box to content size on desktop */

			const messageBoxLineHeight: number	= parseInt(
				this.elements.messageBox().css('line-height'),
				10
			);

			this.elements.messageBox().on('keyup', () =>
				this.elements.messageBox().height(
					messageBoxLineHeight *
					this.elements.messageBox().val().split('\n').length
				)
			);
		}

		setInterval(() => this.messageChange(), 5000);

		(<any> self).tabIndent.renderAll();


		this.session.on(Events.beginChat, async () => this.begin());

		this.session.on(Events.closeChat, () => this.close());

		this.session.on(Events.connect, async () => {
			this.changeState(States.keyExchange);

			const start: number	= Util.timestamp();

			while (this.keyExchangeProgress <= 100) {
				await Util.sleep();

				this.keyExchangeProgress	=
					(Util.timestamp() - start) / Chat.approximateKeyExchangeTime * 100
				;
			}

			this.keyExchangeProgress	= 100;
		});

		this.session.on(Events.connectFailure, () => this.abortSetup());

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
				o.author !== Users.me,
				o.selfDestructTimeout
			)
		);

		this.session.on(rpcEvents.typing, (isFriendTyping: boolean) =>
			this.setFriendTyping(isFriendTyping)
		);
	}
}
