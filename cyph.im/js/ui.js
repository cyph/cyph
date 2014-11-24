var
	abortSetup,
	addMessageToChat,
	beginChatUi,
	beginWaiting,
	changeState,
	closeChat,
	friendIsTyping,
	insertPhoto,
	isMobile,
	logCyphertext,
	markAllAsSent,
	notify,
	platformString,
	scrolling,
	sendMessage,
	state,
	states,
	statusNotFound
;


angular.
	module('Cyph', ['ngMaterial', 'ngSanitize', 'btford.markdown', 'timer']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', function ($scope, $mdSidenav, $mdToast) {
		var $window				= $(window);
		var $html				= $('html');
		var $everything			= $('*');
		var $messageBox			= $('#message-box');
		var $messageList		= $('#message-list, #message-list > md-content');
		var $timer				= $('#timer');
		var $fileUploadButtons	= $('md-button input[type="file"]');
		var $buttons			= $('md-button');
		var $copyUrl			= $('#copy-url input');
		var $cyphertext			= $('#cyphertext.curtain, #cyphertext.curtain > md-content');

		$scope.language			= language;
		$scope.isAlive			= true;
		$scope.isConnected		= false;
		$scope.isFriendTyping	= false;
		$scope.cyphertext		= [];
		$scope.messages			= [];
		$scope.message			= '';
		$scope.unreadMessages	= 0;
		$scope.authors			= authors;
		$scope.copyUrl			= '';

		states = $scope.states = {
			none: 0,
			spinningUp: 1,
			waitingForFriend: 2,
			chatBeginMessage: 3,
			blank: 4,
			chat: 200,
			aborted: 400,
			error: 404
		};
		state = $scope.state = $scope.states.none;


		/* https://coderwall.com/p/ngisma */
		function apply (fn) {
			var phase = $scope['$root']['$$phase'];

			if (phase == '$apply' || phase == '$digest') {
				fn && (typeof(fn) === 'function') && fn();
			}
			else {
				$scope.$apply(fn);
			}
		}



		abortSetup = $scope.abortSetup = function () {
			changeState($scope.states.aborted);
			sendChannelData({Destroy: true});
			$scope.disconnect();
		};


		var newMessageNotification	= getString('newMessageNotification');

		addMessageToChat = $scope.addMessageToChat = function (text, author, shouldNotify) {
			if ($scope.state == $scope.states.aborted) {
				return;
			}

			if (text) {
				if (shouldNotify !== false) {
					switch (author) {
						case authors.friend:
							notify(newMessageNotification);
							break;

						case authors.app:
							notify(text);
							break;
					}
				}

				text	= text
					.split(' ')
					.map(function (s) {
						if (isValidUrl(s)) {
							return '[' +
								s +
								'](//' +
								s.replace(/^\/\//, '').replace(/^http:\/\//, '').replace(/^https:\/\//, '') +
								')'
							;
						}
						else {
							return s;
						}
					})
					.join(' ')
				;

				apply(function () {
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
						timestamp: ($scope.isConnected || author == authors.app) ? getTimestamp() : ''
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


		beginChatUi = $scope.beginChatUi = function (callback) {
			if ($scope.state == $scope.states.aborted) {
				return;
			}

			notify(connectedNotification);
			changeState($scope.states.chatBeginMessage);
			$timer[0].stop();

			setTimeout(function () {
				if ($scope.state == $scope.states.aborted) {
					return;
				}

				callback && callback();

				changeState($scope.states.chat);

				/* Fix file upload buttons */
				$fileUploadButtons.each(function () {
					var $this	= $(this);
					$this.parent().parent().append($this.detach());
				});

				/* Adjust font size for translations */
				if (!isMobile) {
					$buttons.each(function () {
						var $this	= $(this);
						var $clone	= $this
							.clone()
							.css({display: 'inline', width: 'auto', visibility: 'hidden', position: 'fixed'})
							.appendTo('body')
						;
						var $both	= $this.add($clone);

						for (var i = 0 ; i < 10 && $clone.width() > $this.width() ; ++i) {
							var newFontSize	= parseInt($this.css('font-size'), 10) - 1;
							$both.css('font-size', newFontSize + 'px');
						}

						$clone.remove();
					});
				}

				addMessageToChat(getString('introductoryMessage'), authors.app, false);
			}, 3000);
		};


		beginWaiting = $scope.beginWaiting = function () {
			changeState($scope.states.waitingForFriend);

			var copyUrl		=
				document.location.protocol + '//' +
				document.location.host.replace('www.', '') +
				document.location.pathname
			;

			var noMoreAutoFocus	= false;

			var copyUrlInterval	= setInterval(function () {
				if ($scope.state == $scope.states.waitingForFriend) {
					apply(function () {
						$scope.copyUrl	= copyUrl;

						if (!noMoreAutoFocus || $copyUrl.is(':focus')) {
							$copyUrl.focus();
							$copyUrl[0].setSelectionRange(0, copyUrl.length);

							if (isMobile) {
								noMoreAutoFocus	= true;
							}
						}
					});
				}
				else {
					clearInterval(copyUrlInterval);
				}
			}, 250);

			$timer[0].start();
		};


		changeState = $scope.changeState = function (state) {
			apply(function () {
				state = $scope.state = state;
			});
		};


		var disconnectedNotification	= getString('disconnectedNotification');

		closeChat = $scope.closeChat = function (callback) {
			if ($scope.state == $scope.states.aborted) {
				return;
			}

			if ($scope.isAlive) {
				friendIsTyping(false);

				if ($scope.isConnected) {
					addMessageToChat(disconnectedNotification, authors.app);
					sendChannelData({Destroy: true}, {callback: callback});

					apply(function () {
						$scope.isAlive	= false;
					});
				}
				else {
					abortSetup();
				}
			}
		};


		friendIsTyping = $scope.friendIsTyping = function (isFriendTyping) {
			apply(function () {
				$scope.isFriendTyping	= isFriendTyping;
			});
		};


		var imageFile;
		var photoMax	= 1920;
		var canvas		= document.createElement('canvas');
		var ctx			= canvas.getContext('2d');
		var img			= new Image;
		var reader		= new FileReader;

		function sendImage (result) {
			sendMessage('![](' + result + ')');
		}

		reader.onload	= function () {
			sendImage(reader.result);
		};

		img.onload	= function () {
			var widthFactor		= photoMax / img.width;
			widthFactor			= widthFactor > 1 ? 1 : widthFactor;
			var heightFactor	= photoMax / img.height;
			heightFactor		= heightFactor > 1 ? 1 : heightFactor;
			var factor			= Math.min(widthFactor, heightFactor);

			canvas.width		= img.width * factor;
			canvas.height		= img.height * factor;

			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			var hasTransparency	=
				imageFile.type != 'image/jpeg' &&
				ctx.getImageData(0, 0, img.width, img.height).data[3] != 255
			;

			var result	= hasTransparency ? canvas.toDataURL() : canvas.toDataURL(
				'image/jpeg',
				Math.min(960 / Math.max(canvas.width, canvas.height), 1)
			);

			URL.revokeObjectURL(img.src);

			sendImage(result);
		};

		insertPhoto = $scope.insertPhoto = function (elem) {
			if (elem.files && elem.files.length > 0) {
				imageFile	= elem.files[0];

				if (imageFile.type == 'image/svg+xml' || imageFile.type == 'image/gif') {
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
				apply(function () {
					$scope.cyphertext.push({author: author, text: text.replace(/\//g, '∕')});
				});
			}
		};


		markAllAsSent = $scope.markAllAsSent = function () {
			apply(function () {
				for (var i = 0 ; i < $scope.messages.length ; ++i) {
					var message	= $scope.messages[i];

					if (!message.timestamp) {
						message.timestamp	= getTimestamp();
					}
				}

				$scope.isConnected	= true;
			});
		};


		sendMessage = $scope.sendMessage = function (message) {
			if (!message) {
				message	= $scope.message;

				apply(function () {
					$scope.message	= '';
				});

				$scope.onMessageChange();
			}

			if (message) {
				if (isMobile) {
					$messageBox.focus();
				}
				else {
					$scope.scrollDown();
				}

				addMessageToChat(message, authors.me);
				otr.sendMsg(message);
			}
		};



		$scope.baseButtonClick	= function () {
			if (isMobile) {
				$mdSidenav('menu').close();
			}
		};


		$scope.disconnect	= function () {
			socketClose();

			$scope.baseButtonClick();
		};


		var imtypingyo	= false;

		$scope.onMessageChange	= function () {
			var newImtypingYo	= $scope.message != '';

			if (imtypingyo != newImtypingYo) {
				imtypingyo	= newImtypingYo;
				sendChannelData({Misc: imtypingyo ? 'imtypingyo' : 'donetyping'});
			}
		};


		$scope.openMobileMenu	= function () {
			$mdSidenav('menu').open();
		};


		$scope.scrollDown	= function (shouldScrollCyphertext) {
			(shouldScrollCyphertext ?
				$cyphertext :
				$messageList
			).each(function () {
				var $this	= $(this);
				$this.animate({scrollTop: $this[0].scrollHeight}, 350);
			});

			scrolling.update();
		};


		var showCyphertextLock	= false;
		var curtainClass		= 'curtain';
		var cypherToastPosition	= 'top right';
		var cypherToast1		= getString('cypherToast1');
		var cypherToast2		= getString('cypherToast2');
		var cypherToast3		= getString('cypherToast3');

		$scope.closeCyphertext	= function () {
			if ($('.' + curtainClass).length < 1) {
				return;
			}

			$everything.removeClass(curtainClass);

			setTimeout(function () {
				$mdToast.show({
					template: '<md-toast>' + cypherToast3 + '</md-toast>',
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
			$scope.baseButtonClick();

			if (showCyphertextLock) {
				return;
			}

			showCyphertextLock	= true;

			$mdToast.show({
				template: '<md-toast>' + cypherToast1 + '</md-toast>',
				hideDelay: 2000,
				position: cypherToastPosition,
				detachSwipe: function () {}
			});

			setTimeout(function () {
				$mdToast.show({
					template: '<md-toast>' + cypherToast2 + '</md-toast>',
					hideDelay: 3000,
					position: cypherToastPosition,
					detachSwipe: function () {}
				});

				setTimeout(function () {
					$everything.addClass(curtainClass);
				}, 3000);
			}, 2000);
		};


		$scope.twoFactor	= function () {
			alert(
				'This feature hasn\'t been implemented yet, but it will ' +
				'freeze the chat until both users have verified their ' +
				'identities via two-factor authentication.'
			);

			$scope.baseButtonClick();
		};



		isMobile	= (function () {
			try {
				document.createEvent('TouchEvent');
				return true;
			}
			catch (e) {
				return false;
			}
		}());

		platformString	= isMobile ? 'mobile' : 'desktop';

		$('.' + platformString + '-only [deferred-src], [deferred-src].' + platformString + '-only').
			each(function () {
				var $this	= $(this);
				$this.attr('src', $this.attr('deferred-src'));
			})
		;


		$.fn.tap	= function (callback, onOrOff, once) {
			var $this		= $(this);
			var eventName	= isMobile ? 'touchstart' : 'click';

			if (!callback) {
				$this.trigger(eventName);
			}
			else if (onOrOff === false) {
				$this.off(eventName, callback);
			}
			else if (once === true) {
				$this.one(eventName, callback);
			}
			else {
				$this.on(eventName, callback);
			}

			return $this;
		}


		/* onenterpress attribute handler */

		$('[onenterpress]').each(function () {
			var $this			= $(this);
			var enterpressOnly	= $this.attr('enterpress-only');

			if (!enterpressOnly || enterpressOnly == platformString) {
				$this.keypress(function (e) {
					if (e.keyCode == 13 && !e.shiftKey) {
						var onenterpress	= $this.attr('onenterpress');

						if (onenterpress) {
							eval(onenterpress);
							e.preventDefault();
						}
					}
				});
			}
		});


		/* Visibility */

		if (!isMobile) {
			window.Visibility	= new FocusVisibility;
		}


		/* Notifications */

		var notifyTitle			= 'Cyph';
		var notifyIcon			= '/img/favicon/apple-touch-icon-180x180.png';
		var notifyAudio			= new Audio('/audio/beep.mp3');
		var disableNotify		= false;
		var openNotifications	= [];

		notify	= function (message) {
			if (!disableNotify && Visibility.hidden()) {
				if (window.Notification) {
					var notification	= new Notification(notifyTitle, {body: message, icon: notifyIcon});

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

		var userAgent	= navigator.userAgent.toLowerCase();

		var setUpFullScreenEvent;

		if (isMobile) {
			$html.addClass('mobile');

			$messageBox.focus(function () {
				$scope.scrollDown();
			});


			/* $(function () {
				var $body	= $('body');
				var heights	= {};

				if (window.outerHeight > window.outerWidth) {
					heights.portrait	= window.outerHeight;
					heights.landscape	= window.outerWidth;
				}
				else {
					heights.portrait	= window.outerWidth;
					heights.landscape	= window.outerHeight;
				}

				function setBodyHeight () {
					$body.height(
						((window.outerHeight >= heights.portrait ? heights.portrait : heights.landscape) + 50)
							+ 'px'
					);
				}

				setBodyHeight();
				$(window).on('orientationchange', function () {
					setTimeout(setBodyHeight, 1000);
				});
			}); */
		}


		/* OS X-style scrollbars */

		scrolling	= {
			isNanoScroller: !isMobile && navigator.userAgent.toLowerCase().indexOf('mac os x') < 0,
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

		$buttons.tap(function () {
			setTimeout(function () {
				$('md-button, md-button *').blur();
			}, 500);
		});

		var observer	= new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				var $elem		= $(mutation.addedNodes.length > 0 ? mutation.addedNodes[0] : mutation.target);

				/* Process read-ness and scrolling */
				if ($elem.is('.message-item.unread')) {
					var isHidden	= Visibility.hidden();
					var currentScrollPosition	=
						$messageList[0].scrollHeight -
						($messageList[0].scrollTop + $messageList[0].clientHeight)
					;

					if (!isHidden && ($elem.height() + 50) > currentScrollPosition) {
						$scope.scrollDown();
						$elem.removeClass('unread');
					}

					if (isHidden || !$elem.is(':appeared')) {
						apply(function () { $scope.unreadMessages += 1 });

						var intervalId	= setInterval(function () {
							if (!Visibility.hidden() && ($elem.is(':appeared') || $elem.nextAll(':not(.unread)').length > 0)) {
								clearInterval(intervalId);
								$elem.removeClass('unread');
								apply(function () { $scope.unreadMessages -= 1 });

								if ($elem.nextAll().length == 0) {
									$scope.scrollDown();
								}
							}
						}, 100);
					}
				}

				/* Process image lightboxes */
				else if ($elem.is('p:not(.processed)')) {
					var $html	= $($elem[0].outerHTML);

					$html.find('img').each(function () {
						var $this	= $(this);

						if ($this.parent().prop('tagName').toLowerCase() != 'a') {
							var $a	= $('<a></a>')
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
			});
		});

		observer.observe($('#message-list md-list')[0], {
			childList: true,
			attributes: false,
			characterData: false,
			subtree: true
		});

		
		/* Do the move lad */

		scrolling.update();

		if (isHistoryAvailable && history.replaceState) {
			history.replaceState({}, '', '/' + getUrlState());
		}
		processUrlState();

		if (window.Notification) {
			Notification.requestPermission();
		}


		/* Temporary warning for desktop IE */

		if (!isMobile && (navigator.userAgent.indexOf('MSIE ') >= 0 || navigator.userAgent.indexOf('Trident/') >= 0)) {
			alert(
				"We won't stop you from using Internet Explorer, but it is a *very* poor life choice.\n\n" +
				"IE doesn't work very well with Cyph (or in general).\n\nYou have been warned."
			);
		}
	}])
;
