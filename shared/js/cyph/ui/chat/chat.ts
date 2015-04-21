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

				public isConnected: boolean		= false;
				public isDisconnected: boolean	= false;
				public isFriendTyping: boolean	= false;
				public unreadMessages: number	= 0;
				public currentMessage: string	= '';
				public state: States			= States.none;

				public messages: {
					author: Session.Authors;
					authorClass: string;
					isFromApp: boolean;
					isFromFriend: boolean;
					isFromMe: boolean;
					text: string,
					timestamp: string;
				}[]	= [];

				public cyphertext: Cyphertext;
				public photoManager: PhotoManager;
				public p2pManager: P2PManager;
				public scrollManager: ScrollManager;
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

					let go: Function	= () => {
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
					};


					Util.getValue(Elements.timer[0], 'stop', () => {})();

					if (this.session.state.hasKeyExchangeBegun) {
						go();
					}
					else {
						this.changeState(States.keyExchange);

						let intervalId	= setInterval(() => {
							if (this.session.state.hasKeyExchangeBegun) {
								clearInterval(intervalId);
								go();
							}
						}, 250);
					}
				}

				public close () : void {
					if (this.state === States.aborted) {
						return;
					}

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
					let isMessageChanged: boolean	=
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

					this.session		= new Session.ThreadedSession(Util.getUrlState(), controller);
					this.cyphertext		= new Cyphertext(this.controller, this.mobileMenu, this.dialogManager);
					this.p2pManager		= new P2PManager(this.session, this.controller, this.mobileMenu, this.dialogManager);
					this.photoManager	= new PhotoManager(this.session);
					this.scrollManager	= new ScrollManager(this.controller, this.dialogManager);


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

					setInterval(() => this.messageChange(), 5000);

					self['tabIndent'].renderAll();



					/* Main session events */

					this.session.on(Session.Events.beginChat, () => this.begin());

					this.session.on(Session.Events.closeChat, () => this.close());

					this.session.on(Session.Events.cyphertext,
						(o: { cyphertext: string; author: Session.Authors; }) =>
							this.cyphertext.log(o.cyphertext, o.author)
					);

					this.session.on(Session.Events.smp, (wasSuccessful: boolean) => {
						if (wasSuccessful) {
							this.setConnected();
						}
						else {
							this.abortSetup();
						}
					});

					this.session.on(Session.Events.text,
						(o: { text: string; author: Session.Authors; }) =>
							this.addMessage(o.text, o.author, o.author !== Session.Authors.me)
					);

					this.session.on(Session.Events.typing, (isFriendTyping: boolean) =>
						this.setFriendTyping(isFriendTyping)
					);


					/* P2P events */

					this.session.on(
						Session.Events.p2pUi,
						(e: {
							category: P2P.UIEvents.Categories;
							event: P2P.UIEvents.Events;
							args: any[];
						}) => {
							switch (e.category) {
								case P2P.UIEvents.Categories.base: {
									switch (e.event) {
										case P2P.UIEvents.Events.connected: {
											let isConnected: boolean	= e.args[0];

											if (isConnected) {
												this.addMessage(
													Strings.webRTCConnect,
													Session.Authors.app,
													false
												);
											}
											else {
												this.dialogManager.alert({
													title: Strings.videoCallingTitle,
													content: Strings.webRTCDisconnect,
													ok: Strings.ok
												});

												this.addMessage(
													Strings.webRTCDisconnect,
													Session.Authors.app,
													false
												);
											}
											break;
										}
										case P2P.UIEvents.Events.enable: {
											this.p2pManager.enable();
											break;
										}
										case P2P.UIEvents.Events.videoToggle: {
											let isVideoCall: boolean	= e.args[0];

											this.p2pManager.toggleVideoCall(isVideoCall);
											break;
										}
									}
									break;
								}
								case P2P.UIEvents.Categories.file: {
									switch (e.event) {
										case P2P.UIEvents.Events.clear: {
											Elements.p2pFiles.each((i: number, elem: HTMLElement) =>
												$(elem).val('')
											);
											break;
										}
										case P2P.UIEvents.Events.confirm: {
											let name: string		= e.args[0];
											let callback: Function	= e.args[1];

											let title: string	= Strings.incomingFile + ' ' + name;

											this.dialogManager.confirm({
												title,
												content: Strings.incomingFileWarning,
												ok: Strings.save,
												cancel: Strings.reject
											}, (ok: boolean) => callback(ok, title));
											break;
										}
										case P2P.UIEvents.Events.get: {
											let callback: Function	= e.args[0];

											let file: File	= Elements.p2pFiles.
												toArray().
												map(($elem) => $elem['files']).
												reduce((a, b) => (a && a[0]) ? a : b, [])[0]
											;

											callback(file);
											break;
										}
										case P2P.UIEvents.Events.rejected: {
											let title: string	= e.args[0];

											this.dialogManager.alert({
												title,
												content: Strings.incomingFileReject,
												ok: Strings.ok
											});
											break;
										}
										case P2P.UIEvents.Events.tooLarge: {
											this.dialogManager.alert({
												title: Strings.oopsTitle,
												content: Strings.fileTooLarge,
												ok: Strings.ok
											});
											break;
										}
										case P2P.UIEvents.Events.transferStarted: {
											let author: Session.Authors	= e.args[0];
											let fileName: string		= e.args[1];

											let isFromMe: boolean	= author === Session.Authors.me;
											let message: string		= isFromMe ?
													Strings.fileTransferInitMe :
													Strings.fileTransferInitFriend
											;

											this.addMessage(
												message + ' ' + fileName,
												Session.Authors.app,
												!isFromMe
											);
											break;
										}
									}
									break;
								}
								case P2P.UIEvents.Categories.request: {
									switch (e.event) {
										case P2P.UIEvents.Events.acceptConfirm: {
											let callType: string	= e.args[0];
											let timeout: number		= e.args[1];
											let callback: Function	= e.args[2];

											this.dialogManager.confirm({
												title: Strings.videoCallingTitle,
												content:
													Strings.webRTCRequest + ' ' +
													Strings[callType + 'Call'] + '. ' +
													Strings.webRTCWarning
												,
												ok: Strings.continueDialogAction,
												cancel: Strings.decline,
												timeout
											}, ok => callback());
											break;
										}
										case P2P.UIEvents.Events.requestConfirm: {
											let callType: string	= e.args[0];
											let callback: Function	= e.args[1];

											this.dialogManager.confirm({
												title: Strings.videoCallingTitle,
												content:
													Strings.webRTCInit + ' ' +
													Strings[callType + 'Call'] + '. ' +
													Strings.webRTCWarning
												,
												ok: Strings.continueDialogAction,
												cancel: Strings.cancel
											}, ok => callback);
											break;
										}
										case P2P.UIEvents.Events.requestConfirmation: {
											this.dialogManager.alert({
												title: Strings.videoCallingTitle,
												content: Strings.webRTCRequestConfirmation,
												ok: Strings.ok
											});
											break;
										}
										case P2P.UIEvents.Events.requestRejection: {
											this.dialogManager.alert({
												title: Strings.videoCallingTitle,
												content: Strings.webRTCDeny,
												ok: Strings.ok
											});
											break;
										}
									}
									break;
								}
								case P2P.UIEvents.Categories.stream: {
									let author: Session.Authors	= e.args[0];

									let $stream: JQuery	=
										author === Session.Authors.me ?
											Elements.p2pMeStream :
											author === Session.Authors.friend ?
												Elements.p2pFriendStream :
												Elements.p2pFriendPlaceholder
									;

									switch (e.event) {
										case P2P.UIEvents.Events.play: {
											let shouldPlay: boolean	= e.args[1];

											$stream[0][shouldPlay ? 'play' : 'pause']();
											break;
										}
										case P2P.UIEvents.Events.set: {
											let url: string	= e.args[1];

											try {
												URL.revokeObjectURL($stream.attr('src'));
											}
											catch (_) {}

											$stream.attr('src', url);
											break;
										}
									}
									break;
								}
							}
						}
					);
				}
			}
		}
	}
}
