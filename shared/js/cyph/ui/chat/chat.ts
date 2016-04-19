import {Cyphertext} from 'cyphertext';
import {States} from 'enums';
import {IChat} from 'ichat';
import {ICyphertext} from 'icyphertext';
import {IElements} from 'ielements';
import {IP2PManager} from 'ip2pmanager';
import {IPhotoManager} from 'iphotomanager';
import {IScrollManager} from 'iscrollmanager';
import {P2PManager} from 'p2pmanager';
import {PhotoManager} from 'photomanager';
import {ScrollManager} from 'scrollmanager';
import {Affiliate} from 'ui/affiliate';
import {BaseButtonManager} from 'ui/basebuttonmanager';
import {Carousel} from 'ui/carousel';
import {DialogManager} from 'ui/dialogmanager';
import {Elements} from 'ui/elements';
import {IDialogManager} from 'ui/idialogmanager';
import {INotifier} from 'ui/inotifier';
import {ISidebar} from 'ui/isidebar';
import {NanoScroller} from 'ui/nanoscroller';
import {Templates} from 'ui/templates';
import {Analytics} from 'cyph/analytics';
import {Env} from 'cyph/env';
import {IController} from 'cyph/icontroller';
import {Strings} from 'cyph/strings';
import {UrlState} from 'cyph/urlstate';
import {Util} from 'cyph/util';
import * as Session from 'session/session';


export {
	Cyphertext,
	IChat,
	ICyphertext,
	IElements,
	IP2PManager,
	IPhotoManager,
	IScrollManager,
	P2PManager,
	PhotoManager,
	ScrollManager,
	States
};


export class Chat extends BaseButtonManager implements IChat {
	private static approximateKeyExchangeTime: number	= 10000;


	private elements: IElements;
	private isMessageChanged: boolean;
	private previousMessage: string;

	public isConnected: boolean			= false;
	public isDisconnected: boolean		= false;
	public isFriendTyping: boolean		= false;
	public currentMessage: string		= '';
	public keyExchangeProgress: number	= 0;
	public state: States				= States.none;

	public messages: {
		author: Session.Users;
		text: string;
		timestamp: string;
	}[]	= [];

	public cyphertext: ICyphertext;
	public photoManager: IPhotoManager;
	public p2pManager: IP2PManager;
	public scrollManager: IScrollManager;
	public session: Session.ISession;

	public abortSetup () : void {
		this.changeState(States.aborted);
		this.session.trigger(Session.Events.abort);
		this.session.close();
	}

	public addMessage (
		text: string,
		author: Session.Users,
		shouldNotify: boolean = true
	) : void {
		if (this.state === States.aborted) {
			return;
		}

		if (text) {
			if (shouldNotify !== false) {
				switch (author) {
					case Session.Users.friend:
						this.notifier.notify(Strings.newMessageNotification);
						break;

					case Session.Users.app:
						this.notifier.notify(text);
						break;
				}
			}

			this.messages.push({
				author: author,
				text: text,
				timestamp: Util.getTime()
			});

			this.controller.update();

			this.scrollManager.scrollDown(true);

			if (author === Session.Users.me) {
				this.scrollManager.scrollDown();
			}
			else {
				NanoScroller.update();
			}
		}
	}

	public begin (callback: Function = () => {}) : void {
		if (this.state === States.aborted) {
			return;
		}

		this.notifier.notify(Strings.connectedNotification);
		this.changeState(States.chatBeginMessage);

		setTimeout(() => {
			if (this.state === States.aborted) {
				return;
			}

			callback();

			this.session.trigger(Session.Events.beginChatComplete);
			this.changeState(States.chat);

			/* Adjust font size for translations */
			if (!this.isMobile) {
				setTimeout(() => {
					this.elements.buttons.each((i: number, elem: HTMLElement) => {
						const $this: JQuery		= $(elem);

						const $clone: JQuery	= $this
							.clone()
							.css({
								display: 'inline',
								width: 'auto',
								visibility: 'hidden',
								position: 'fixed'
							})
							.appendTo('body')
						;

						const $both: JQuery		= $this.add($clone);

						let fontSize: number	= parseInt($this.css('font-size'), 10);

						for (let i = 0 ; i < 20 && $clone.width() > $this.width() ; ++i) {
							fontSize	-= 1;
							$both.css('font-size', fontSize + 'px');
						}

						$clone.remove();
					});
				}, 10000);
			}

			this.addMessage(Strings.introductoryMessage, Session.Users.app, false);
			this.setConnected();
		}, 3000);
	}

	public changeState (state: States) : void {
		this.state	= state;
		this.controller.update();
	}

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
			this.addMessage(Strings.disconnectedNotification, Session.Users.app);
			this.session.close(true);
		}
	}

	public disconnectButton () : void {
		this.baseButtonClick(() => {
			this.dialogManager.confirm({
				title: Strings.disconnectTitle,
				content: Strings.disconnectConfirm,
				ok: Strings.continueDialogAction,
				cancel: Strings.cancel
			}, (ok) => {
				if (ok) {
					this.close();
				}
			});
		});
	}

	public formattingHelpButton () : void {
		this.baseButtonClick(() => {
			this.dialogManager.baseDialog({
				template: Templates.formattingHelp
			});

			Analytics.main.send({
				hitType: 'event',
				eventCategory: 'formatting-help',
				eventAction: 'show',
				eventValue: 1
			});
		});
	}

	public messageChange () : void {
		const isMessageChanged: boolean	=
			this.currentMessage !== '' &&
			this.currentMessage !== this.previousMessage
		;

		this.previousMessage	= this.currentMessage;

		if (this.isMessageChanged !== isMessageChanged) {
			this.isMessageChanged	= isMessageChanged;
			this.session.send(
				new Session.Message(
					Session.RPCEvents.typing,
					this.isMessageChanged
				)
			);
		}
	}

	public send (message?: string) : void {
		if (!message) {
			message	= this.currentMessage;

			this.currentMessage	= '';
			this.controller.update();

			this.messageChange();
		}

		if (message) {
			this.addMessage(message, Session.Users.me, false);
			this.scrollManager.scrollDown();
			this.session.sendText(message);
		}
	}

	public setConnected () : void {
		this.isConnected	= true;
		this.controller.update();
	}

	public setFriendTyping (isFriendTyping: boolean) : void {
		this.isFriendTyping	= isFriendTyping;
		this.controller.update();
	}

	/**
	 * @param controller
	 * @param dialogManager
	 * @param mobileMenu
	 * @param notifier
	 * @param isMobile
	 * @param session If not specified, one will be created.
	 */
	public constructor (
		controller: IController,
		private dialogManager: IDialogManager,
		mobileMenu: ISidebar,
		private notifier: INotifier,
		public isMobile: boolean = Env.isMobile,
		session?: Session.ISession,
		private rootElement: JQuery = Elements.html
	) {
		super(controller, mobileMenu);

		this.elements	= {
			buttons: this.rootElement.find(Elements.buttons.selector),
			cyphertext: this.rootElement.find(Elements.cyphertext.selector),
			everything: this.rootElement.find(Elements.everything.selector),
			insertPhotoMobile: this.rootElement.find(Elements.insertPhotoMobile.selector),
			messageBox: this.rootElement.find(Elements.messageBox.selector),
			messageList: this.rootElement.find(Elements.messageList.selector),
			messageListInner: this.rootElement.find(Elements.messageListInner.selector),
			p2pContainer: this.rootElement.find(Elements.p2pContainer.selector),
			p2pFiles: this.rootElement.find(Elements.p2pFiles.selector),
			p2pFriendPlaceholder: this.rootElement.find(Elements.p2pFriendPlaceholder.selector),
			p2pFriendStream: this.rootElement.find(Elements.p2pFriendStream.selector),
			p2pMeStream: this.rootElement.find(Elements.p2pMeStream.selector),
			sendButton: this.rootElement.find(Elements.sendButton.selector),
			timer: this.rootElement.find(Elements.timer.selector)
		};

		let forceTURN: boolean;

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

				Analytics.main.send({
					hitType: 'event',
					eventCategory: 'modest-branding',
					eventAction: 'used',
					eventValue: 1
				});
			}

			/* Force TURN API flag */
			if (id[0] === '$') {
				id	=
					id.substring(1) +
					(id.length > 1 ? 'a' : '')
				;

				forceTURN	= true;

				Analytics.main.send({
					hitType: 'event',
					eventCategory: 'force-turn',
					eventAction: 'used',
					eventValue: 1
				});
			}

			this.session	= new Session.ThreadedSession(
				id,
				controller
			);
		}

		this.cyphertext		= new Cyphertext(
			this.session,
			this.controller,
			this.mobileMenu,
			this.dialogManager,
			this.isMobile,
			this.elements
		);

		this.p2pManager		= new P2PManager(
			this,
			this.controller,
			this.mobileMenu,
			this.dialogManager,
			this.elements,
			forceTURN
		);

		this.photoManager	= new PhotoManager(
			this,
			this.elements
		);

		this.scrollManager	= new ScrollManager(
			this.controller,
			this.dialogManager,
			this.isMobile,
			this.elements
		);


		if (this.isMobile) {
			/* Prevent jankiness upon message send on mobile */

			let lastClick: number	= 0;

			this.elements.messageBox.click(e => {
				this.elements.sendButton.add(this.elements.insertPhotoMobile).each((i, elem) => {
					const $button	= $(elem);
					const bounds	= $button['bounds']();

					if (
						(e.pageY > bounds.top && e.pageY < bounds.bottom) &&
						(e.pageX > bounds.left && e.pageX < bounds.right)
					) {
						const now: number	= Date.now();

						if (now - lastClick > 500) {
							lastClick	= now;
							$button.click();
						}

						return;
					}
				});
			});
		}
		else {
			/* Adapt message box to content size on desktop */

			const messageBoxLineHeight: number	= parseInt(
				this.elements.messageBox.css('line-height'),
				10
			);

			this.elements.messageBox.on('keyup', () =>
				this.elements.messageBox.height(
					messageBoxLineHeight *
					this.elements.messageBox.val().split('\n').length
				)
			);
		}

		setInterval(() => this.messageChange(), 5000);

		self['tabIndent'].renderAll();



		this.session.on(Session.Events.beginChat, () => this.begin());

		this.session.on(Session.Events.closeChat, () => this.close());

		this.session.on(Session.Events.connect, () => {
			this.changeState(States.keyExchange);
			Util.getValue(this.elements.timer[0], 'stop', () => {}).call(this.elements.timer[0]);

			const start: number	= Date.now();
			const intervalId	= setInterval(() => {
				const progress: number	=
					(Date.now() - start) / Chat.approximateKeyExchangeTime
				;

				if (progress > 1) {
					clearInterval(intervalId);
				}
				else {
					this.keyExchangeProgress	= progress * 100;
					this.controller.update();
				}
			}, 50);
		});

		this.session.on(Session.Events.connectFailure, () => this.abortSetup());

		this.session.on(Session.Events.pingPongTimeout, () => {
			if (!this.isDisconnected) {
				this.addMessage(Strings.pingPongTimeout, Session.Users.app);

				this.dialogManager.alert({
					title: Strings.pingPongTimeoutTitle,
					content: Strings.pingPongTimeout,
					ok: Strings.ok
				});
			}
		});

		this.session.on(Session.RPCEvents.text,
			(o: { text: string; author: Session.Users; }) => {
				if (o.author !== Session.Users.me) {
					this.addMessage(o.text, o.author);
				}
			}
		);

		this.session.on(Session.RPCEvents.typing, (isFriendTyping: boolean) =>
			this.setFriendTyping(isFriendTyping)
		);
	}
}
