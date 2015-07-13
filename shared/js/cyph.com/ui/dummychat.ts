/// <reference path="../../base.ts" />

/// <reference path="../../../global/plugins.jquery.ts" />

/// <reference path="../../p2p/p2p.ts" />
/// <reference path="../../channel/queue.ts" />
/// <reference path="../../session/message.ts" />
/// <reference path="../../session/threadedsession.ts" />
/// <reference path="../templates.ts" />
/// <reference path="../basebuttonmanager.ts" />
/// <reference path="../elements.ts" />
/// <reference path="../nanoscroller.ts" />
/// <reference path="../visibilitywatcher.ts" />
/// <reference path="../affiliate.ts" />
/// <reference path="cyphertext.ts" />
/// <reference path="p2pmanager.ts" />
/// <reference path="photomanager.ts" />
/// <reference path="scrollmanager.ts" />


module Cyph.com {
	export module UI {
			export class DummyChat extends BaseButtonManager implements IChat {

			private isMessageChanged: boolean;
			private previousMessage: string;
			private other: DummyChat;

			public isConnected: boolean			= true;
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
			}

			public addMessage (
				text: string,
				author: Session.Users,
				shouldNotify?: boolean
			) : void {
				if (text) {

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
							Elements.buttons.each((i: number, elem: HTMLElement) => {
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

					this.addMessage(Strings.introductryMessage, Session.Users.app, false);
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

				this.setFriendTyipng(false);

				if (!this.isConnected) {
					this.abortSetup();
				}
				else if (!this.isDisconnected) {
					this.isDisconnected	= true;
					this.addMessage(Strings.disconnectedNotification, Session.Users.app);
					this.session.close(true);
				}
			}

			public connectChat(other){
				this.other	= other;
			}

			public disconnectButton () : void {
				his.baseButtonClick(() => {
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
					this.other.setFriendTyping(this.isMessageChanged)
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
					this.addMessage(message, Session.Users.me);
					this.scrollManager.scrollDown();
					setTimeout(() => this.other.addmessage(message, Session.Users.friend), 250);
				}
			}

			public setConnected () : void {
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
			 */
			public constructor (
				controller: IController,
				private dialogManager: IDialogManager,
				mobileMenu: ISidebar,
				private notifier: INotifier,
				public isMobile: boolean = Cyph.Env.isMobile
			) {
				super(controller, mobileMenu);

				let urlState: string	= UrlState.get(true);

				/* Modest branding API flag */
				if (urlState[0] === '&') {
					urlState	=
						urlState.substring(1) +
						(urlState.length > 1 ? 'a' : '')
					;

					Cyph.UI.Elements.html.addClass('modest');

					Analytics.main.send({
						hitType: 'event',
						eventCategory: 'modest-branding',
						eventAction: 'used',
						eventValue: 1
					});
				}

				this.cyphertext		= new Cyphertext(
					this.session,
					this.controller,
					this.mobileMenu,
					this.dialogManager,
					this.isMobile
				);

				this.photoManager	= new PhotoManager(this);

				this.scrollManager	= new ScrollManager(
					this.controller,
					this.dialogManager,
					this.isMobile
				);


				if (this.isMobile) {
					/* Prevent jankiness upon message send on mobile */

					Elements.messageBox.click(e => {
						Elements.sendButton.add(Elements.insertPhotoMobile).each((i, elem) => {
							const $button	= $(elem);
							const bounds	= $button['bounds']();

							if (
								(e.pageY > bounds.top && e.pageY < bounds.bottom) &&
								(e.pageX > bounds.left && e.pageX < bounds.right)
							) {
								$button.click();
								return;
							}
						});
					});
				}
				else {
					/* Adapt message box to content size on desktop */

					const messageBoxLineHeight: number	= parseInt(
						Elements.messageBox.css('line-height'),
						10
					);

					Elements.messageBox.on('keyup', () =>
						Elements.messageBox.height(
							messageBoxLineHeight *
							Elements.messageBox.val().split('\n').length
						)
					);
				}

				setInterval(() => this.messageChange(), 5000);

				self['tabIndent'].renderAll();

			}
			
		}
	}
}