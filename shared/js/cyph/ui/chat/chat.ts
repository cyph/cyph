			
			public isConnected: boolean		= false;
			public isDisconnected: boolean	= false;
			public isFriendTyping: boolean	= false;
			public isVideoCall: boolean		= false;
			public isWebRTCEnabled: boolean	= false;
			public unreadMessages: number	= 0;
			public currentMessage: string	= '';
			public messages: string[]		= [];

			public p2p: Cyph.P2P.IP2P;
			public session: Cyph.Session.ISession;



			

			public abortSetup () {
				UI.Elements.window.off('beforeunload');
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
							case Cyph.Session.Authors.friend:
								notify(Strings.newMessageNotification);
								break;

							case Cyph.Session.Authors.app:
								notify(text);
								break;
						}
					}

					this.messages.push({
						author: author,
						authorClass: 'author-' + (
							author === Cyph.Session.Authors.me ? 'me' :
								author === Cyph.Session.Authors.friend ? 'friend' : 'app'
						),
						isFromApp: author === Cyph.Session.Authors.app,
						isFromFriend: author === Cyph.Session.Authors.friend,
						isFromMe: author === Cyph.Session.Authors.me,
						text: text,
						timestamp: Util.getTimestamp()
					});

					this.controller.update();

					this.scrollDown(true);

					if (author === Cyph.Session.Authors.me) {
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
					UI.Elements.copyUrlInput.remove();

					setTimeout(() => {
						if (this.state === States.aborted) {
							return;
						}

						callback && callback();

						changeState(States.chat);

						/* Adjust font size for translations */
						if (!Cyph.Env.isMobile) {
							setTimeout(() => {
								UI.Elements.buttons.each(() => {
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

						addMessageToChat(Strings.introductoryMessage, Cyph.Session.Authors.app, false);
					}, 3000);
				};


				UI.Elements.timer && UI.Elements.timer[0].stop();

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
						addMessageToChat(Strings.disconnectedNotification, Cyph.Session.Authors.app);

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

			public enableWebRTC () {
				this.controller.update(() => {
					this.isWebRTCEnabled	= true;
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
					addMessageToChat(message, Cyph.Session.Authors.me);
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

			public sendFileButton () {
				this.baseButtonClick(() => {
					if (this.isWebRTCEnabled) {
						if (!this.isVideoCall) {
							webRTC.helpers.requestCall('file');
						}
						else {
							webRTC.helpers.sendFile();
						}
					}
				});
			}

			public toggleVideoCall (isVideoCall) {
				this.controller.update(() => {
					this.isVideoCall	= isVideoCall;
				});
			}

			public videoCallButton () {
				this.baseButtonClick(() => {
					if (this.isWebRTCEnabled) {
						if (!this.isVideoCall) {
							webRTC.helpers.requestCall('video');
						}
						else {
							webRTC.helpers.setUpStream({video: !webRTC.streamOptions.video});
						}
					}
				});
			}

			public videoCallClose () {
				this.baseButtonClick(() => {
					webRTC.helpers.kill();
				});
			}

			public voiceCallButton () {
				this.baseButtonClick(() => {
					if (this.isWebRTCEnabled) {
						if (!this.isVideoCall) {
							webRTC.helpers.requestCall('voice');
						}
						else {
							webRTC.helpers.setUpStream({audio: !webRTC.streamOptions.audio});
						}
					}
				});
			}

			public webRTCDisabledAlert () {
				let message	= $('#webrtc-disabled-message').attr('title');

				if (message) {
					alertDialog({
						title: Strings.videoCallingTitle,
						content: message,
						ok: Strings.ok
					});
				}
			}




			/* Crazy fix to prevent jankiness upon message send on mobile */
			if (Cyph.Env.isMobile) {
				let mobileButtons	= [UI.Elements.sendButton, UI.Elements.insertPhotoMobile];

				UI.Elements.messageBox.click((e) => {
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
				let messageBoxLineHeight	= parseInt(UI.Elements.messageBox.css('line-height'), 10);
				UI.Elements.messageBox.on('keyup', () => {
					UI.Elements.messageBox.height(messageBoxLineHeight * UI.Elements.messageBox.val().split('\n').length);
				});
			}

			tabIndent.renderAll();


			let session: Session.ISession	= new Session.ThreadedSession(Util.getUrlState(), controller);
			let p2p: P2P.IP2P				= new new P2P.P2P(session, controller);
