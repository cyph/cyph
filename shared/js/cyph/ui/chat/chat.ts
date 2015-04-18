/// <reference path="cyphertext.ts" />
/// <reference path="enums.ts" />
/// <reference path="ichat.ts" />
/// <reference path="photomanager.ts" />
/// <reference path="scrollmanager.ts" />
/// <reference path="../basebuttonmanager.ts" />
/// <reference path="../elements.ts" />
/// <reference path="../idialogmanager.ts" />
/// <reference path="../inotifier.ts" />
/// <reference path="../isidebar.ts" />
/// <reference path="../../analytics.ts" />
/// <reference path="../../icontroller.ts" />
/// <reference path="../../strings.ts" />
/// <reference path="../../session/enums.ts" />
/// <reference path="../../../global/base.ts" />
/// <reference path="../../../../lib/typings/jquery/jquery.d.ts" />


module Cyph {
	export module UI {
		export module Chat {
			export class Chat extends BaseButtonManager implements IChat {
				private dialogManager: IDialogManager;
				private notifier: INotifier;

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

				public changeState (state: States) : void {
					this.state	= state;
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
				}
			}
		}
	}
}


			
			



			

			public abortSetup () {
				Elements.window.off('beforeunload');
				changeState(States.aborted);
				channelClose();
			}

			public addMessage (text, author, shouldNotify) {
				if (this.state === States.aborted) {
					return;
				}

				if (text) {
					if (shouldNotify !== false) {
						switch (author) {
							case Session.Authors.friend:
								notify(Strings.newMessageNotification);
								break;

							case Session.Authors.app:
								notify(text);
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

					this.scrollDown(true);

					if (author === Session.Authors.me) {
						this.scrollDown();
					}
					else {
						scrolling.update();
					}
				}
			}


			public beginChatUi (callback) {
				if (this.state === States.aborted) {
					return;
				}

				let dothemove: Function	= () {
					notify(Strings.connectedNotification);
					changeState(States.chatBeginMessage);

					/* Stop mobile browsers from keeping this selected */
					Elements.copyUrlInput.remove();

					setTimeout(() => {
						if (this.state === States.aborted) {
							return;
						}

						callback && callback();

						changeState(States.chat);

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

						addMessageToChat(Strings.introductoryMessage, Session.Authors.app, false);
					}, 3000);
				};


				Elements.timer && Elements.timer[0].stop();

				if (hasKeyExchangeBegun) {
					dothemove();
				}
				else {
					changeState(States.keyExchange);

					let intervalId	= setInterval(() => {
						if (hasKeyExchangeBegun) {
							clearInterval(intervalId);
							dothemove();
						}
					}, 250);
				}
			}

			public closeChat () {
				if (this.state === States.aborted) {
					return;
				}

				Timer.stopAll();

				if (this.isAlive) {
					friendIsTyping(false);

					if (this.isConnected) {
						addMessageToChat(Strings.disconnectedNotification, Session.Authors.app);

						this.controller.update(() => {
							isAlive = this.isAlive = false;
							this.isDisconnected	= true;
						});
					}
					else {
						abortSetup();
					}
				}
			}

			public disconnect () {
				this.baseButtonClick(() => {
					confirmDialog({
						title: Strings.disconnectTitle,
						content: Strings.disconnectConfirm,
						ok: Strings.continueDialogAction,
						cancel: Strings.cancel
					}, (ok) => {
						if (ok) {
							channelClose();
						}
					});
				});
			}

			public formattingHelp () {
				this.baseButtonClick(() => {
					$mdDialog.show({
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

			public friendIsTyping (isFriendTyping) {
				this.controller.update(() => {
					this.isFriendTyping	= isFriendTyping;
				});
			}

			public markAllAsSent () {
				this.controller.update(() => {
					this.isConnected	= true;
				});
			}

			public sendMessage (message) {
				if (!message) {
					message	= this.message;

					this.controller.update(() => {
						this.message	= '';
					});

					this.onMessageChange();
				}

				if (message) {
					addMessageToChat(message, Session.Authors.me);
					this.scrollDown();
					otr.sendMsg(message);
				}
			}



			let imtypingyo, previousMessage;

			public onMessageChange () {
				let newImtypingYo	= this.message !== '' && this.message !== previousMessage;
				previousMessage		= this.message;

				if (imtypingyo !== newImtypingYo) {
					imtypingyo	= newImtypingYo;
					sendChannelData({Misc: imtypingyo ? channelDataMisc.imtypingyo : channelDataMisc.donetyping});
				}
			}

			setInterval(this.onMessageChange, 5000);




			/* Crazy fix to prevent jankiness upon message send on mobile */
			if (Env.isMobile) {
				let mobileButtons	= [Elements.sendButton, Elements.insertPhotoMobile];

				Elements.messageBox.click((e) => {
					for (let i = 0 ; i < mobileButtons.length ; ++i) {
						let $button	= mobileButtons[i];
						let bounds	= $button.bounds();

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
				let messageBoxLineHeight	= parseInt(Elements.messageBox.css('line-height'), 10);
				Elements.messageBox.on('keyup', () => {
					Elements.messageBox.height(messageBoxLineHeight * Elements.messageBox.val().split('\n').length);
				});
			}

			tabIndent.renderAll();


			let session: Session.ISession	= new Session.ThreadedSession(Util.getUrlState(), controller);
