/// <reference path="../../cyph/ui/templates.ts" />
/// <reference path="../../cyph/ui/basebuttonmanager.ts" />
/// <reference path="../../cyph/ui/elements.ts" />
/// <reference path="../../cyph/ui/nanoscroller.ts" />
/// <reference path="../../cyph/ui/visibilitywatcher.ts" />
/// <reference path="../../cyph/ui/affiliate.ts" />
/// <reference path="../../cyph/ui/chat/cyphertext.ts" />
/// <reference path="../../cyph/ui/chat/photomanager.ts" />
/// <reference path="../../cyph/ui/chat/scrollmanager.ts" />


module Cyph.com {
	export module UI {
		export class DummyChat extends Cyph.UI.BaseButtonManager implements Cyph.UI.Chat.IChat {
			private isMessageChanged: boolean;
			private previousMessage: string;
			private other: DummyChat;

			public isConnected: boolean			= true;
			public isDisconnected: boolean		= false;
			public isFriendTyping: boolean		= false;
			public currentMessage: string		= '';
			public keyExchangeProgress: number	= 0;
			public state: Cyph.UI.Chat.States	= Cyph.UI.Chat.States.none;

			public messages: {
				author: Session.Users;
				text: string;
				timestamp: string;
			}[]	= [];

			public cyphertext: Cyph.UI.Chat.ICyphertext;
			public photoManager: Cyph.UI.Chat.IPhotoManager;
			public p2pManager: Cyph.UI.Chat.IP2PManager;
			public scrollManager: Cyph.UI.Chat.IScrollManager;
			public session: Session.ISession;

			public abortSetup () : void {}

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
						Cyph.UI.NanoScroller.update();
					}
				}
			}

			public begin (callback: Function = () => {}) : void {
				if (this.state === Cyph.UI.Chat.States.aborted) {
					return;
				}

				this.changeState(Cyph.UI.Chat.States.chatBeginMessage);

				setTimeout(() => {
					if (this.state === Cyph.UI.Chat.States.aborted) {
						return;
					}

					callback();

					this.session.trigger(Session.Events.beginChatComplete);
					this.changeState(Cyph.UI.Chat.States.chat);

					/* Adjust font size for translations */
					if (!this.isMobile) {
						setTimeout(() => {
							Cyph.UI.Elements.buttons.each((i: number, elem: HTMLElement) => {
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

					this.addMessage(Cyph.Strings.introductoryMessage, Session.Users.app, false);
					this.setConnected();
				}, 3000);
			}

			public changeState (state: Cyph.UI.Chat.States) : void {
				this.state	= state;
				this.controller.update();
			}

			public close () : void {
				if (this.state === Cyph.UI.Chat.States.aborted) {
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

			public connectChat (other: DummyChat) {
				this.other	= other;
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
						template: Cyph.UI.Templates.formattingHelp
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
					setTimeout(() => this.other.addMessage(message, Session.Users.friend), 250);
				}
			}

			public setConnected () : void {}

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
				private dialogManager: Cyph.UI.IDialogManager,
				mobileMenu: Cyph.UI.ISidebar,
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

				this.cyphertext		= new Cyph.UI.Chat.Cyphertext(
					<any> {on: () => {}},
					this.controller,
					this.mobileMenu,
					this.dialogManager,
					this.isMobile
				);

				this.photoManager	= new Cyph.UI.Chat.PhotoManager(this);

				this.scrollManager	= new Cyph.UI.Chat.ScrollManager(
					this.controller,
					this.dialogManager,
					this.isMobile
				);


				if (this.isMobile) {
					/* Prevent jankiness upon message send on mobile */

					Cyph.UI.Elements.messageBox.click(e => {
						Cyph.UI.Elements.sendButton.add(Cyph.UI.Elements.insertPhotoMobile).each((i, elem) => {
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
						Cyph.UI.Elements.messageBox.css('line-height'),
						10
					);

					Cyph.UI.Elements.messageBox.on('keyup', () =>
						Cyph.UI.Elements.messageBox.height(
							messageBoxLineHeight *
							Cyph.UI.Elements.messageBox.val().split('\n').length
						)
					);
				}

				setInterval(() => this.messageChange(), 5000);

				self['tabIndent'].renderAll();
			}
		}
	}
}
