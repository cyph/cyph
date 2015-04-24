/// <reference path="../../base.ts" />

/// <reference path="../../../global/plugins.jquery.ts" />

/// <reference path="../../p2p/p2p.ts" />
/// <reference path="../../session/message.ts" />
/// <reference path="../../session/threadedsession.ts" />
/// <reference path="../basebuttonmanager.ts" />
/// <reference path="../elements.ts" />
/// <reference path="../nanoscroller.ts" />
/// <reference path="../visibilitywatcher.ts" />
/// <reference path="../affiliate.ts" />
/// <reference path="cyphertext.ts" />
/// <reference path="p2pmanager.ts" />
/// <reference path="photomanager.ts" />
/// <reference path="scrollmanager.ts" />


module Cyph {
	export module UI {
		export module Chat {
			export class Chat extends BaseButtonManager implements IChat {
				private isMessageChanged: boolean;
				private previousMessage: string;

				public isConnected: boolean		= false;
				public isDisconnected: boolean	= false;
				public isFriendTyping: boolean	= false;
				public currentMessage: string	= '';
				public state: States			= States.none;

				public messages: {
					author: Session.Authors;
					authorString: string;
					text: string,
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
					author: Session.Authors,
					shouldNotify: boolean = true
				) : void {
					if (this.state === States.aborted) {
						return;
					}

					if (text) {
						if (shouldNotify !== false) {
							switch (author) {
								case Session.Authors.friend:
									this.notifier.notify(Strings.newMessageNotification);
									break;

								case Session.Authors.app:
									this.notifier.notify(text);
									break;
							}
						}

						this.messages.push({
							author: author,
							authorString:
								author === Session.Authors.me ?
									'me' :
									author === Session.Authors.friend ?
										'friend' :
										'app'
							,
							text: text,
							timestamp: Util.getTimestamp()
						});

						this.controller.update();

						this.scrollManager.scrollDown(true);

						if (author === Session.Authors.me) {
							this.scrollManager.scrollDown();
						}
						else {
							NanoScroller.update();
						}
					}
				}

				public changeState (state: States) : void {
					this.state	= state;
					this.controller.update();
				}

				public begin (callback: Function = () => {}) : void {
					if (this.state === States.aborted) {
						return;
					}

					this.notifier.notify(Strings.connectedNotification);
					this.changeState(States.chatBeginMessage);

					/* Stop mobile browsers from keeping this selected */
					Elements.copyUrlInput.remove();

					setTimeout(() => {
						if (this.state === States.aborted) {
							return;
						}

						callback();

						this.session.trigger(Session.Events.beginChatComplete);
						this.changeState(States.chat);

						/* Adjust font size for translations */
						if (!Env.isMobile) {
							setTimeout(() => {
								Elements.buttons.each((i: number, elem: HTMLElement) => {
									let $this: JQuery	= $(elem);

									let $clone: JQuery	= $this
										.clone()
										.css({
											display: 'inline',
											width: 'auto',
											visibility: 'hidden',
											position: 'fixed'
										})
										.appendTo('body')
									;

									let $both: JQuery	= $this.add($clone);

									let fontSize: number	= parseInt($this.css('font-size'), 10);

									for (let i = 0 ; i < 20 && $clone.width() > $this.width() ; ++i) {
										fontSize	-= 1;
										$both.css('font-size', fontSize + 'px');
									}

									$clone.remove();
								});
							}, 500);
						}

						this.addMessage(Strings.introductoryMessage, Session.Authors.app, false);
					}, 3000);
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
						this.addMessage(Strings.disconnectedNotification, Session.Authors.app);
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
							template: $('#templates > .formatting-help')[0].outerHTML
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
					let isMessageChanged: boolean	=
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
						this.addMessage(message, Session.Authors.me, false);
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

				public constructor (
					controller: IController,
					private dialogManager: IDialogManager,
					mobileMenu: ISidebar,
					private notifier: INotifier
				) {
					super(controller, mobileMenu);

					this.session		= new Session.ThreadedSession(UrlState.get(), controller);
					this.cyphertext		= new Cyphertext(this.session, this.controller, this.mobileMenu, this.dialogManager);
					this.p2pManager		= new P2PManager(this, this.controller, this.mobileMenu, this.dialogManager);
					this.photoManager	= new PhotoManager(this);
					this.scrollManager	= new ScrollManager(this.controller, this.dialogManager);


					if (Env.isMobile) {
						/* Prevent jankiness upon message send on mobile */

						Elements.messageBox.click(e => {
							for (let $button of [Elements.sendButton, Elements.insertPhotoMobile]) {
								let bounds	= $button['bounds']();

								if (
									(e.pageY > bounds.top && e.pageY < bounds.bottom) &&
									(e.pageX > bounds.left && e.pageX < bounds.right)
								) {
									$button.click();
									return;
								}
							}
						});
					}
					else {
						/* Adapt to message box to content size on desktop */

						let messageBoxLineHeight: number	= parseInt(
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



					this.session.on(Session.Events.beginChat, () => this.begin());

					this.session.on(Session.Events.closeChat, () => this.close());

					this.session.on(Session.Events.connect, () => {
						this.changeState(States.keyExchange);
						Util.getValue(Elements.timer[0], 'stop', () => {}).call(Elements.timer[0]);
					});

					this.session.on(Session.Events.pingPongTimeout, () => {
						this.addMessage(Strings.pingPongTimeout, Session.Authors.app);

						this.dialogManager.alert({
							title: Strings.pingPongTimeoutTitle,
							content: Strings.pingPongTimeout,
							ok: Strings.ok
						});
					});

					this.session.on(Session.Events.smp, (wasSuccessful: boolean) => {
						if (wasSuccessful) {
							this.setConnected();
						}
						else {
							this.abortSetup();
						}
					});

					this.session.on(Session.RPCEvents.text,
						(o: { text: string; author: Session.Authors; }) => {
							if (o.author !== Session.Authors.me) {
								this.addMessage(o.text, o.author);
							}
						}
					);

					this.session.on(Session.RPCEvents.typing, (isFriendTyping: boolean) =>
						this.setFriendTyping(isFriendTyping)
					);
				}
			}
		}
	}
}
