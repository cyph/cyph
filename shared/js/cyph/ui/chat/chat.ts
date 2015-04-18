/// <reference path="cyphertext.ts" />
/// <reference path="enums.ts" />
/// <reference path="ichat.ts" />
/// <reference path="p2pmanager.ts" />
/// <reference path="photomanager.ts" />
/// <reference path="scrollmanager.ts" />
/// <reference path="../basebuttonmanager.ts" />
/// <reference path="../elements.ts" />
/// <reference path="../idialogmanager.ts" />
/// <reference path="../inotifier.ts" />
/// <reference path="../isidebar.ts" />
/// <reference path="../nanoscroller.ts" />
/// <reference path="../../analytics.ts" />
/// <reference path="../../icontroller.ts" />
/// <reference path="../../strings.ts" />
/// <reference path="../../session/enums.ts" />
/// <reference path="../../session/isession.ts" />
/// <reference path="../../session/threadedsession.ts" />
/// <reference path="../../../global/base.ts" />
/// <reference path="../../../global/plugins.jquery.ts" />
/// <reference path="../../../../lib/typings/jquery/jquery.d.ts" />


module Cyph {
	export module UI {
		export module Chat {
			export class Chat extends BaseButtonManager implements IChat {
				private isMessageChanged: boolean;
				private previousMessage: string;
				private dialogManager: IDialogManager;
				private notifier: INotifier;
				private scrollManager: ScrollManager;

				public isConnected: boolean		= false;
				public isDisconnected: boolean	= false;
				public isFriendTyping: boolean	= false;
				public unreadMessages: number	= 0;
				public currentMessage: string	= '';
				public state: States			= States.none;
				public messages: {author: Session.Authors; text: string;}[]	= [];

				public cyphertext: Cyphertext;
				public photoManager: PhotoManager;
				public p2pManager: P2PManager;
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
							authorClass: 'author-' + (
								author === Session.Authors.me ? 'me' :
									author === Session.Authors.friend ? 'friend' : 'app'
							),
							isFromApp: author === Session.Authors.app,
							isFromFriend: author === Session.Authors.friend,
							isFromMe: author === Session.Authors.me,
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

					let dothemove: Function	= () => {
						this.notifier.notify(Strings.connectedNotification);
						this.changeState(States.chatBeginMessage);

						/* Stop mobile browsers from keeping this selected */
						Elements.copyUrlInput.remove();

						setTimeout(() => {
							if (this.state === States.aborted) {
								return;
							}

							callback();

							this.changeState(States.chat);

							/* Adjust font size for translations */
							if (!Env.isMobile) {
								setTimeout(() => {
									Elements.buttons.each(() => {
										let $this		= $(this);
										let $clone		= $this
											.clone()
											.css({display: 'inline', width: 'auto', visibility: 'hidden', position: 'fixed'})
											.appendTo('body')
										;
										let $both		= $this.add($clone);

										let fontSize	= parseInt($this.css('font-size'), 10);

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
					};


					Util.getValue(Elements.timer[0] || {}, 'stop', () => {})();

					if (this.session.state.hasKeyExchangeBegun) {
						dothemove();
					}
					else {
						this.changeState(States.keyExchange);

						let intervalId	= setInterval(() => {
							if (this.session.state.hasKeyExchangeBegun) {
								clearInterval(intervalId);
								dothemove();
							}
						}, 250);
					}
				}

				public close () : void {
					if (this.state === States.aborted) {
						return;
					}

					Timer.stopAll();

					if (this.session.state.isAlive) {
						this.setFriendTyping(false);

						if (this.isConnected) {
							this.addMessage(Strings.disconnectedNotification, Session.Authors.app);

							this.isDisconnected	= true;
							this.session.updateState(Session.State.isAlive, true);
						}
						else {
							this.abortSetup();
						}
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
					let isMessageChanged	=
						this.currentMessage !== '' &&
						this.currentMessage !== this.previousMessage
					;

					this.previousMessage	= this.currentMessage;

					if (this.isMessageChanged !== isMessageChanged) {
						this.isMessageChanged	= isMessageChanged;
						this.session.send(
							new Session.Message(
								Session.Events.typing,
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
					dialogManager: IDialogManager,
					mobileMenu: ISidebar,
					notifier: INotifier
				) {
					super(controller, mobileMenu);

					this.dialogManager	= dialogManager;
					this.notifier		= notifier;

					this.scrollManager	= new ScrollManager(this.controller, this.dialogManager);
					this.session		= new Session.ThreadedSession(Util.getUrlState(), controller);


					if (Env.isMobile) {
						/* Prevent jankiness upon message send on mobile */

						let mobileButtons: JQuery[]	= [Elements.sendButton, Elements.insertPhotoMobile];

						Elements.messageBox.click((e) => {
							for (let $button of mobileButtons) {
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

					setInterval(this.messageChange, 5000);

					let tabIndent: any;
					tabIndent.renderAll();
				}
			}
		}
	}
}
