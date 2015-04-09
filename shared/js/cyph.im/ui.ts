var
	abortSetup,
	addMessageToChat,
	alertDialog,
	beginChatUi,
	beginWaiting,
	changeState,
	closeChat,
	confirmDialog,
	enableWebRTC,
	friendIsTyping,
	warnWebSignObsolete,
	insertPhoto,
	logCyphertext,
	markAllAsSent,
	notify,
	scrolling,
	sendFileButton,
	sendMessage,
	state,
	states,
	statusNotFound,
	toggleVideoCall,
	updateUI
;


angular.
	module('Cyph', ['ngMaterial', 'timer', 'ngMarkdown']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', '$mdDialog', function ($scope, $mdSidenav, $mdToast, $mdDialog) {
		$scope.language			= language;
		$scope.isConnected		= false;
		$scope.isDisconnected	= false;
		$scope.isFriendTyping	= false;
		$scope.cyphertext		= cyphertext;
		$scope.messages			= messages;
		$scope.message			= '';
		$scope.unreadMessages	= 0;
		$scope.authors			= authors;
		$scope.copyUrl			= '';
		$scope.copyUrlEncoded	= '';
		$scope.isOnion			= Env.isOnion;
		$scope.isWebRTCEnabled	= false;
		$scope.isVideoCall		= false;
		$scope.streamOptions	= webRTC.streamOptions;
		$scope.incomingStream	= webRTC.incomingStream;
		$scope.incomingFile		= webRTC.incomingFile;
		$scope.outgoingFile		= webRTC.outgoingFile;

		isAlive = $scope.isAlive = true;

		states = $scope.states = {
			none: 0,
			spinningUp: 1,
			waitingForFriend: 2,
			chatBeginMessage: 3,
			keyExchange: 4,
			blank: 100,
			chat: 200,
			aborted: 400,
			error: 404,
			webSignObsolete: 666
		};
		state = $scope.state = $scope.states.none;


		/* https://coderwall.com/p/ngisma */
		updateUI	= function (fn) {
			let phase = $scope['$root']['$$phase'];

			if (phase == '$apply' || phase == '$digest') {
				fn && (typeof(fn) === 'function') && fn();
			}
			else {
				$scope.$apply(fn);
			}
		};



		abortSetup = $scope.abortSetup = function () {
			ui.elements.window.off('beforeunload');
			changeState($scope.states.aborted);
			channelClose();
		};


		addMessageToChat = $scope.addMessageToChat = function (text, author, shouldNotify) {
			if ($scope.state == $scope.states.aborted) {
				return;
			}

			if (text) {
				if (shouldNotify !== false) {
					switch (author) {
						case authors.friend:
							notify(Strings.newMessageNotification);
							break;

						case authors.app:
							notify(text);
							break;
					}
				}

				updateUI(function () {
					$scope.messages.push({
						author: author,
						authorClass: 'author-' + (
							author == authors.me ? 'me' :
								author == authors.friend ? 'friend' : 'app'
						),
						isFromApp: author == authors.app,
						isFromFriend: author == authors.friend,
						isFromMe: author == authors.me,
						text: text,
						timestamp: Util.getTimestamp()
					});
				});

				$scope.scrollDown(true);

				if (author == authors.me) {
					$scope.scrollDown();
				}
				else {
					scrolling.update();
				}
			}
		};


		alertDialog = $scope.alertDialog = function (o, callback) {
			$mdDialog.show($mdDialog.alert(o)).then(callback);
		};


		beginChatUi = $scope.beginChatUi = function (callback) {
			if ($scope.state == $scope.states.aborted) {
				return;
			}

			function dothemove () {
				notify(Strings.connectedNotification);
				changeState($scope.states.chatBeginMessage);

				/* Stop mobile browsers from keeping this selected */
				ui.elements.copyUrlInput.remove();

				setTimeout(function () {
					if ($scope.state == $scope.states.aborted) {
						return;
					}

					callback && callback();

					changeState($scope.states.chat);

					/* Adjust font size for translations */
					if (!Env.isMobile) {
						setTimeout(function () {
							ui.elements.buttons.each(function () {
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

					addMessageToChat(Strings.introductoryMessage, authors.app, false);
				}, 3000);
			}


			ui.elements.timer && ui.elements.timer[0].stop();

			if (hasKeyExchangeBegun) {
				dothemove();
			}
			else {
				changeState($scope.states.keyExchange);

				let intervalId	= setInterval(function () {
					if (hasKeyExchangeBegun) {
						clearInterval(intervalId);
						dothemove();
					}
				}, 250);
			}
		};


		beginWaiting = $scope.beginWaiting = function () {
			changeState($scope.states.waitingForFriend);

			let copyUrl		=
				((!Env.isOnion && location.origin) || 'https://www.cyph.im') +
				'/#' +
				cyphId +
				sharedSecret
			;

			function setCopyUrl () {
				if ($scope.copyUrl != copyUrl) {
					updateUI(function () {
						$scope.copyUrl			= copyUrl;
						$scope.copyUrlEncoded	= encodeURIComponent(copyUrl);
					});
				}
			}

			function selectCopyUrl () {
				ui.elements.copyUrlInput[0].setSelectionRange(0, copyUrl.length);
			}

			if (Env.isMobile) {
				setCopyUrl();

				/* Only allow right-clicking (for copying the link) */
				ui.elements.copyUrlLink.click(function (e) {
					e.preventDefault();
				});
			}
			else {
				let copyUrlInterval	= setInterval(function () {
					if ($scope.state == $scope.states.waitingForFriend) {
						setCopyUrl();
						ui.elements.copyUrlInput.focus();
						selectCopyUrl();
					}
					else {
						clearInterval(copyUrlInterval);
					}
				}, 250);
			}

			if (Env.isIE) {
				let expireTime	= new Date(Date.now() + 600000)
					.toLocaleTimeString()
					.toLowerCase()
					.replace(/(.*:.*):.*? /, '$1')
				;

				ui.elements.timer.parent().text('Link expires at ' + expireTime)
				delete ui.elements.timer;
			}
			else {
				ui.elements.timer[0].start();
			}
		};


		changeState = $scope.changeState = function (s) {
			if (Env.isWebSignObsolete) {
				return;
			}

			updateUI(function () {
				state = $scope.state = s;
			});
		};


		closeChat = $scope.closeChat = function () {
			if ($scope.state == $scope.states.aborted) {
				return;
			}

			if ($scope.isAlive) {
				friendIsTyping(false);

				if ($scope.isConnected) {
					addMessageToChat(Strings.disconnectedNotification, authors.app);

					updateUI(function () {
						isAlive = $scope.isAlive = false;
						$scope.isDisconnected	= true;
					});
				}
				else if (!Env.isWebSignObsolete) {
					abortSetup();
				}
			}
		};


		confirmDialog = $scope.confirmDialog = function (o, callback, opt_timeout) {
			let promise	= $mdDialog.show($mdDialog.confirm(o));

			let timeoutId;
			if (opt_timeout) {
				timeoutId	= setTimeout(function () {
					$mdDialog.cancel(promise);
				}, opt_timeout);
			}

			function f (ok) {
				timeoutId && clearTimeout(timeoutId);
				callback && callback(ok === true);
			}

			promise.then(f).catch(f);
		};


		enableWebRTC = $scope.enableWebRTC = function () {
			updateUI(function () {
				$scope.isWebRTCEnabled	= true;
			});
		};


		friendIsTyping = $scope.friendIsTyping = function (isFriendTyping) {
			updateUI(function () {
				$scope.isFriendTyping	= isFriendTyping;
			});
		};


		sendFileButton = $scope.sendFileButton = function () {
			$scope.baseButtonClick(function () {
				if ($scope.isWebRTCEnabled) {
					if (!$scope.isVideoCall) {
						webRTC.helpers.requestCall('file');
					}
					else {
						webRTC.helpers.sendFile();
					}
				}
			});
		};


		warnWebSignObsolete = $scope.warnWebSignObsolete = function () {
			ui.elements.window.off('beforeunload');
			channelClose();
			changeState($scope.states.webSignObsolete);

			Env.isWebSignObsolete	= true;
			isAlive				= false;

			Errors.logWebSign();
		};


		let imageFile;
		let photoMax	= 1920;
		let canvas		= document.createElement('canvas');
		let ctx			= canvas.getContext('2d');
		let img			= new Image;
		let reader		= new FileReader;

		function sendImage (result) {
			sendMessage('![](' + result + ')');
		}

		reader.onload	= function () {
			sendImage(reader.result);
		};

		img.onload	= function () {
			let widthFactor		= photoMax / img.width;
			widthFactor			= widthFactor > 1 ? 1 : widthFactor;
			let heightFactor	= photoMax / img.height;
			heightFactor		= heightFactor > 1 ? 1 : heightFactor;
			let factor			= Math.min(widthFactor, heightFactor);

			canvas.width		= img.width * factor;
			canvas.height		= img.height * factor;

			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			let hasTransparency	=
				imageFile.type != 'image/jpeg' &&
				ctx.getImageData(0, 0, img.width, img.height).data[3] != 255
			;

			let result	= hasTransparency ? canvas.toDataURL() : canvas.toDataURL(
				'image/jpeg',
				Math.min(960 / Math.max(canvas.width, canvas.height), 1)
			);

			URL.revokeObjectURL(img.src);

			sendImage(result);
		};

		/* More reliable hack to handle these buttons */
		$(function () {
			ui.elements.buttons.find('input[type="file"]').each(function () {
				let elem	= this;

				let isClicked;

				$(this).click(function (e) {
					e.stopPropagation();
					e.preventDefault();
				}).parent().click(function () {
					if (!isClicked) {
						isClicked	= true;

						let e	= document.createEvent('MouseEvents');
						e.initEvent('click', true, false);
						elem.dispatchEvent(e);

						let finish, intervalId;

						finish	= function () {
							clearInterval(intervalId);
							setTimeout(function () {
								isClicked	= false;
							}, 500);
						};

						intervalId	= setInterval(function () {
							if (elem.files.length > 0) {
								finish();
							}
						}, 500);

						setTimeout(finish, 5000);
					}
				});
			});
		});

		insertPhoto = $scope.insertPhoto = function (elem) {
			if (elem.files && elem.files.length > 0) {
				imageFile	= elem.files[0];

				if (imageFile.type == 'image/gif') {
					reader.readAsDataURL(imageFile);
				}
				else {
					img.src		= URL.createObjectURL(imageFile);
				}

				$(elem).val('');
			}
		};


		logCyphertext = $scope.logCyphertext = function (text, author) {
			if (text) {
				updateUI(function () {
					if (Env.isMobile && $scope.cyphertext.length > 5) {
						$scope.cyphertext.shift();
					}

					$scope.cyphertext.push({author: author, text: JSON.parse(text).message});
				});
			}
		};


		markAllAsSent = $scope.markAllAsSent = function () {
			updateUI(function () {
				$scope.isConnected	= true;
			});
		};


		sendMessage = $scope.sendMessage = function (message) {
			if (!message) {
				message	= $scope.message;

				updateUI(function () {
					$scope.message	= '';
				});

				$scope.onMessageChange();
			}

			if (message) {
				addMessageToChat(message, authors.me);
				$scope.scrollDown();
				otr.sendMsg(message);
			}
		};

		/* Crazy fix to prevent jankiness upon message send on mobile */
		if (Env.isMobile) {
			let mobileButtons	= [ui.elements.sendButton, ui.elements.insertPhotoMobile];

			ui.elements.messageBox.click(function (e) {
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


		toggleVideoCall = $scope.toggleVideoCall = function (isVideoCall) {
			updateUI(function () {
				$scope.isVideoCall	= isVideoCall;
			});
		};



		let isButtonClickLocked;

		$scope.baseButtonClick	= function (callback) {
			if (!isButtonClickLocked) {
				isButtonClickLocked	= true;

				setTimeout(function () {
					if (Env.isMobile) {
						$mdSidenav('menu').close();
					}

					updateUI(callback);

					setTimeout(function () {
						isButtonClickLocked	= false;
					});
				}, 250);
			}
		};


		$scope.disconnect	= function () {
			$scope.baseButtonClick(function () {
				confirmDialog({
					title: Strings.disconnectTitle,
					content: Strings.disconnectConfirm,
					ok: Strings.continueDialogAction,
					cancel: Strings.cancel
				}, function (ok) {
					if (ok) {
						channelClose();
					}
				});
			});
		};


		$scope.formattingHelp	= function () {
			$scope.baseButtonClick(function () {
				$mdDialog.show({
					template: $('#templates > .formatting-help')[0].outerHTML
				});

				anal.send({
					hitType: 'event',
					eventCategory: 'formatting-help',
					eventAction: 'show',
					eventValue: 1
				});
			});
		};


		let imtypingyo, previousMessage;

		$scope.onMessageChange	= function () {
			let newImtypingYo	= $scope.message != '' && $scope.message != previousMessage;
			previousMessage		= $scope.message;

			if (imtypingyo != newImtypingYo) {
				imtypingyo	= newImtypingYo;
				sendChannelData({Misc: imtypingyo ? channelDataMisc.imtypingyo : channelDataMisc.donetyping});
			}
		};

		setInterval($scope.onMessageChange, 5000);


		$scope.openMobileMenu	= function () {
			setTimeout(function () {
				$mdSidenav('menu').open();
			}, 250);
		};


		let scrollDownLock	= 0;

		$scope.scrollDown	= function (shouldScrollCyphertext) {
			if (scrollDownLock < 1) {
				try {
					++scrollDownLock;

					(shouldScrollCyphertext ?
						ui.elements.cyphertext :
						ui.elements.messageList
					).each(function () {
						++scrollDownLock;

						$(this).animate({scrollTop: this.scrollHeight}, 350, function () {
							--scrollDownLock;
						});
					});

					scrolling.update();
				}
				finally {
					--scrollDownLock;
				}
			}
		};


		let showCyphertextLock	= false;
		let curtainClass		= 'curtain';
		let cypherToastPosition	= 'top right';

		$scope.closeCyphertext	= function () {
			if ($('.' + curtainClass).length < 1) {
				return;
			}

			ui.elements.everything.removeClass(curtainClass);

			setTimeout(function () {
				$mdToast.show({
					template: '<md-toast>' + Strings.cypherToast3 + '</md-toast>',
					hideDelay: 1000,
					position: cypherToastPosition,
					detachSwipe: function () {}
				});

				/* Workaround for Angular Material bug */
				setTimeout(function () {
					$('md-toast:visible').remove();
					showCyphertextLock	= false;
				}, 2000);
			}, 2000);
		};

		/* Close cyphertext on esc */
		$(document).keyup(function (e) {
			if (e.keyCode == 27) {
				$scope.closeCyphertext();
			}
		});

		$scope.showCyphertext	= function () {
			$scope.baseButtonClick(function () {
				if (showCyphertextLock) {
					return;
				}

				showCyphertextLock	= true;

				$mdToast.show({
					template: '<md-toast>' + Strings.cypherToast1 + '</md-toast>',
					hideDelay: 2000,
					position: cypherToastPosition,
					detachSwipe: function () {}
				});

				setTimeout(function () {
					$mdToast.show({
						template: '<md-toast>' + Strings.cypherToast2 + '</md-toast>',
						hideDelay: 3000,
						position: cypherToastPosition,
						detachSwipe: function () {}
					});

					setTimeout(function () {
						ui.elements.everything.addClass(curtainClass);

						anal.send({
							hitType: 'event',
							eventCategory: 'cyphertext',
							eventAction: 'show',
							eventValue: 1
						});
					}, 3500);
				}, 2500);
			});
		};


		$scope.videoCallButton	= function () {
			$scope.baseButtonClick(function () {
				if ($scope.isWebRTCEnabled) {
					if (!$scope.isVideoCall) {
						webRTC.helpers.requestCall('video');
					}
					else {
						webRTC.helpers.setUpStream({video: !webRTC.streamOptions.video});
					}
				}
			});
		};


		$scope.videoCallClose	= function () {
			$scope.baseButtonClick(function () {
				webRTC.helpers.kill();
			});
		};


		$scope.voiceCallButton	= function () {
			$scope.baseButtonClick(function () {
				if ($scope.isWebRTCEnabled) {
					if (!$scope.isVideoCall) {
						webRTC.helpers.requestCall('voice');
					}
					else {
						webRTC.helpers.setUpStream({audio: !webRTC.streamOptions.audio});
					}
				}
			});
		};


		$scope.webRTCDisabledAlert	= function () {
			let message	= $('#webrtc-disabled-message').attr('title');

			if (message) {
				alertDialog({
					title: Strings.videoCallingTitle,
					content: message,
					ok: Strings.ok
				});
			}
		};


		/* Visibility */

		if (!Env.isMobile) {
			window.Visibility	= new FocusVisibility;
		}


		/* Notifications */

		let notifyTitle			= 'Cyph';
		let notifyIcon			= '/img/favicon/apple-touch-icon-180x180.png';
		let notifyAudio			= new Audio('/audio/beep.mp3');
		let disableNotify		= false;
		let openNotifications	= [];

		notify	= function (message) {
			if (!disableNotify && Visibility.hidden()) {
				if (window.Notification) {
					let notification	= new Notification(notifyTitle, {body: message, icon: notifyIcon});

					openNotifications.push(notification);

					notification.onclose	= function () {
						while (openNotifications.length > 0) {
							openNotifications.pop().close();
						}

						if (Visibility.hidden()) {
							disableNotify	= true;
						}
					};

					notification.onclick	= function () {
						window.focus();
						notification.onclose();
					};
				}

				notifyAudio.play();

				if (navigator.vibrate) {
					navigator.vibrate(200);
				}
			}
		};


		/* Init */

		let setUpFullScreenEvent;

		if (Env.isMobile) {
			ui.elements.html.addClass('mobile');

			ui.elements.messageBox.focus(function () {
				$scope.scrollDown();
			});
		}
		else {
			let messageBoxLineHeight	= parseInt(ui.elements.messageBox.css('line-height'), 10);
			ui.elements.messageBox.on('keyup', function () {
				ui.elements.messageBox.height(messageBoxLineHeight * ui.elements.messageBox.val().split('\n').length);
			});
		}


		/* OS X-style scrollbars */

		scrolling	= {
			isNanoScroller: !Env.isMobile && Env.userAgent.indexOf('mac os x') < 0,
			update: function () {
				if (this.isNanoScroller) {
					$('.nano').nanoScroller();
				}
			}
		};

		if (!scrolling.isNanoScroller) {
			$('.nano, .nano-content').removeClass('nano').removeClass('nano-content');
		}


		/* For notify and mobile fullscreen */

		Visibility.change(function (e, state) {
			if (state != 'hidden') {
				disableNotify	= false;
				while (openNotifications.length > 0) {
					openNotifications.pop().close();
				}
			}
			else if (setUpFullScreenEvent) {
				setUpFullScreenEvent();
			}
		});

		let observer	= new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				let $elem		= $(mutation.addedNodes.length > 0 ? mutation.addedNodes[0] : mutation.target);

				/* Process read-ness and scrolling */
				if ($elem.is('.message-item.unread')) {
					let isHidden	= Visibility.hidden();
					let currentScrollPosition	=
						ui.elements.messageList[0].scrollHeight -
						(ui.elements.messageList[0].scrollTop + ui.elements.messageList[0].clientHeight)
					;

					if (!isHidden && ($elem.height() + 50) > currentScrollPosition) {
						$scope.scrollDown();
						$elem.removeClass('unread');
					}

					setTimeout(function () {
						if ((isHidden || !$elem.is(':appeared')) && !$elem.find('*').add($elem.parentsUntil().addBack()).is('.app-message')) {
							updateUI(function () { $scope.unreadMessages += 1 });

							let intervalId	= setInterval(function () {
								if (!Visibility.hidden() && ($elem.is(':appeared') || $elem.nextAll('.message-item:not(.unread)').length > 0)) {
									clearInterval(intervalId);
									$elem.removeClass('unread');
									updateUI(function () { $scope.unreadMessages -= 1 });

									if ($elem.nextAll().length == 0) {
										$scope.scrollDown();
									}
								}
							}, 100);
						}
					}, 250);
				}

				/* Process image lightboxes */
				else if ($elem.is('p:not(.processed)')) {
					let $html	= $($elem[0].outerHTML);

					$html.find('img:not(.emoji)').each(function () {
						let $this	= $(this);

						if ($this.parent().prop('tagName').toLowerCase() != 'a') {
							let $a	= $('<a></a>')
							$a.attr('href', $this.attr('src'));

							$this.before($a);
							$this.detach();
							$a.append($this);

							$a.magnificPopup({type: 'image'});
						}
					});

					$html.addClass('processed');

					$elem.replaceWith($html);
				}

				/* Amazon affiliate links */
				Affiliate.process($elem, $mdDialog);
			});
		});

		observer.observe($('#message-list md-list')[0], {
			childList: true,
			attributes: false,
			characterData: false,
			subtree: true
		});





		/***** Temporarily copypasta'd beta signup stuff from cyph.com.ui.js, pending refactor *****/

		let $betaSignupForm		= $('.beta-signup-form');

		$scope.betaSignupState	= 0;

		$scope.betaSignup		= {
			Language: language
		};

		$scope.submitBetaSignup	= function () {
			updateUI(function () {
				++$scope.betaSignupState;
			});

			if ($scope.betaSignupState == 2) {
				setTimeout(function () {
					updateUI(function () {
						++$scope.betaSignupState;
					});
				}, 1500);
			}

			setTimeout(function () {
				/* Temporary workaround */
				let $input	= $betaSignupForm.find('input:visible');
				if ($input.length == 1) {
					$input.focus();
				}
			}, 100);

			let retries	= 0;
			function dothemove () {
				$.ajax({
					type: 'PUT',
					url: Env.baseUrl + 'betasignups',
					data: $scope.betaSignup,
					error: function () {
						if (++retries < 5) {
							dothemove();
						}
						else {
							retries	= 0;
						}
					},
					success: function (isNew) {
						if (isNew == 'true') {
							anal.send({
								hitType: 'event',
								eventCategory: 'signup',
								eventAction: 'new',
								eventValue: 1
							});
						}
					}
				});
			}

			dothemove();
		};

		setTimeout(function () {
			$betaSignupForm.addClass('visible');
		}, 500);




		
		/* Do the move lad */

		tabIndent.renderAll();

		scrolling.update();

		if (window.Notification) {
			Notification.requestPermission();
		}

		window.onhashchange = function () { location.reload() };


		/* Temporary warning for desktop IE */

		if (!Env.isMobile && Env.isIE) {
			alert(
				"We won't stop you from using Internet Explorer, but it is a *very* poor life choice.\n\n" +
				"IE doesn't work very well with Cyph (or in general).\n\nYou have been warned."
			);
		}
	}]).
	config(['$compileProvider', function ($compileProvider) {
		$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sms):/);
	}]);
;
