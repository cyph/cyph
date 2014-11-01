var
	abortSetup,
	addMessageToChat,
	beginChat,
	beginWaiting,
	changeState,
	closeChat,
	isMobile,
	logCyphertext,
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
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', function($scope, $mdSidenav, $mdToast) {
		$scope.language			= language;
		$scope.isAlive			= true;
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
			settingUpCrypto: 3,
			chatBeginMessage: 4,
			blank: 5,
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

				apply(function() {
					var date	= new Date();
					var hour	= date.getHours();
					var ampm	= 'am';
					var minute	= ('0' + date.getMinutes()).slice(-2);

					if (hour >= 12) {
						hour	-= 12;
						ampm	= 'pm';
					}
					if (hour == 0) {
						hour	= 12;
					}

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
						timestamp: hour + ':' + minute + ampm
					});
				});

				if (author == authors.me) {
					$scope.scrollDown();
				}
				else {
					scrolling.update();
				}
			}
		};

		beginChat = $scope.beginChat = function () {
			if ($scope.state == $scope.states.aborted) {
				return;
			}

			changeState($scope.states.chatBeginMessage);
			$('#timer')[0].stop();

			setTimeout(function () {
				changeState($scope.states.chat);

				/* Adjust font size for translations */
				if (!isMobile) {
					$('md-button').each(function () {
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

			var $copyUrl	= $('#copy-url input');

			var copyUrlInterval	= setInterval(function () {
				if ($scope.state == $scope.states.waitingForFriend) {
					apply(function () {
						$scope.copyUrl	= copyUrl;
						$copyUrl[0].setSelectionRange(0, copyUrl.length);
					});
				}
				else {
					clearInterval(copyUrlInterval);
				}
			}, 250);

			$('#timer')[0].start();
		};

		changeState = $scope.changeState = function (state) {
			apply(function() {
				state = $scope.state = state;
			});
		};

		var disconnectedNotification	= getString('disconnectedNotification');
		closeChat = $scope.closeChat = function () {
			if ($scope.state == $scope.states.aborted) {
				return;
			}

			if ($scope.isAlive) {
				if ($scope.state == $scope.states.chat) {
					addMessageToChat(disconnectedNotification, authors.app);
					sendChannelData({Destroy: true});

					apply(function() {
						$scope.isAlive	= false;
					});
				}
				else {
					abortSetup();
				}
			}
		};

		logCyphertext = $scope.logCyphertext = function (text, author) {
			if (text) {
				apply(function() {
					$scope.cyphertext.push({author: author, text: text});
				});
			}
		};

		sendMessage = $scope.sendMessage = function () {
			var message	= $scope.message;

			apply(function() {
				$scope.message	= '';
			});

			if (message) {
				if (isMobile) {
					$('#message-box').focus();
				}
				else {
					$scope.scrollDown();
				}

				addMessageToChat(message, authors.me);
				otr.sendMsg(message);
			}
		};


		$scope.disconnect	= function() {
			socket.close();

			if (isMobile) {
				$mdSidenav('menu').close();
			}
		};

		$scope.openMobileMenu	= function() {
			$mdSidenav('menu').open();
		};

		var $messageList	= $('#message-list, #message-list > md-content');
		$scope.scrollDown	= function() {
			$messageList.each(function () {
				var $this	= $(this);
				$this.animate({scrollTop: $this[0].scrollHeight}, 350);
			});

			scrolling.update();
		};

		var curtainClass		= 'curtain';
		var $everything			= $('*');
		var cypherToastPosition	= 'top right';
		var cypherToast1		= getString('cypherToast1');
		var cypherToast2		= getString('cypherToast2');
		var cypherToast3		= getString('cypherToast3');
		$scope.showCyphertext	= function() {
			if (isMobile) {
				$mdSidenav('menu').close();
			}

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

					function removeClass () {
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
							}, 2000);
						}, 2000);
					}

					var timeoutId	= setTimeout(removeClass, 10000);
					setTimeout(function () {
						$('#cyphertext').tap(function () {
							removeClass();
							clearTimeout(timeoutId);
						}, true, true);
					}, 3500);
				}, 3000);
			}, 2000);
		};

		$scope.twoFactor	= function() {
			alert(
				'This feature hasn\'t been implemented yet, but it will ' +
				'freeze the chat until both users have verified their ' +
				'identities via two-factor authentication.'
			);

			if (isMobile) {
				$mdSidenav('menu').close();
			}
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


		$('.' + platformString + '-only [deferred-src], [deferred-src].' + platformString + '-only').each(function () {
			var $this	= $(this);
			$this.attr('src', $this.attr('deferred-src'));
		});


		/* onenterpress attribute handler */

		$('[onenterpress]').each(function () {
			var $this			= $(this);
			var enterpressOnly	= $this.attr('enterpress-only');

			if (!enterpressOnly || enterpressOnly == platformString) {
				$this.keypress(function(e) {
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
			window.Visibility	= window.FocusVisibility;
		}


		/* Notifications */

		var notifyTitle			= 'Cyph';
		var notifyIcon			= '/img/favicon/apple-touch-icon-180x180.png';
		var notifyAudio			= new Audio('/audio/beep.mp3');
		var disableNotify		= false;
		var openNotifications	= [];

		notify	= function (message) {
			if (!disableNotify && Visibility.hidden) {
				if (window.Notification) {
					var notification	= new Notification(notifyTitle, {body: message, icon: notifyIcon});

					openNotifications.push(notification);

					notification.onclose	= function () {
						while (openNotifications.length > 0) {
							openNotifications.pop().close();
						}

						if (Visibility.hidden) {
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
			$('html').addClass('mobile');

			var $messageBox	= $('#message-box');

			/* TODO: determine which platforms would benefit from this */
			if (userAgent.indexOf('android') > -1) {
				var focusLock			= false;
				var shouldGoFullScreen	= false;

				var $body				= $('body');
				var $focusBlock			= $('#message-box-overlay');

				setUpFullScreenEvent	= function () {
					$messageBox.blur();
					shouldGoFullScreen	= true;
				}

				setUpFullScreenEvent();

				function messageBoxFocus () {
					$focusBlock.hide();
					$messageBox.focus();
					$scope.scrollDown();
					focusLock	= false;
				}

				function messageBoxFocusEvent () {
					if (focusLock) {
						return;
					}

					if (shouldGoFullScreen && screenfull.enabled && !screenfull.isFullscreen) {
						focusLock	= true;

						$focusBlock.show();
						$messageBox.blur();
						screenfull.request();

						/* Assume the user doesn't like fullscreen if they close it quickly */
						setTimeout(function () {
							if (!screenfull.isFullscreen) {
								$messageBox.off('focus', messageBoxFocusEvent);
								$messageBox.focus(function () {
									$scope.scrollDown();
								});
							}
						}, 5000);

						if (screenfull.isFullscreen) {
							shouldGoFullScreen	= false;

							$body.focus();
							setTimeout(messageBoxFocus, 2500);
						}
						else {
							messageBoxFocus();
						}
					}
					else {
						shouldGoFullScreen	= false;
					}
				}

				$messageBox.focus(messageBoxFocusEvent);
			}
			else {
				$messageBox.focus(function () {
					$scope.scrollDown();
				});
			}
		}


		/* OS X-style scrollbars */
		scrolling	= {
			isNanoScroller: !isMobile && userAgent.indexOf('mac os x') < 0,
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
		Visibility.change(function (isHidden) {
			if (!isHidden) {
				disableNotify	= false;
				while (openNotifications.length > 0) {
					openNotifications.pop().close();
				}
			}
			else if (setUpFullScreenEvent) {
				setUpFullScreenEvent();
			}
		});

		$('md-button').tap(function () {
			setTimeout(function () {
				$('md-button, md-button *').blur();
			}, 500);
		});

		var unreadMessage	= '.message-item.unread';

		$('#message-list md-list').on('DOMNodeInserted', function (e) {
			var $elem	= $(e.target);

			if (!$elem.is(unreadMessage)) {
				return;
			}

			var isHidden	= Visibility.hidden;
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
					if (!Visibility.hidden && ($elem.is(':appeared') || $elem.nextAll(':not(.unread)').length > 0)) {
						clearInterval(intervalId);
						$elem.removeClass('unread');
						apply(function () { $scope.unreadMessages -= 1 });

						if ($elem.nextAll().length == 0) {
							$scope.scrollDown();
						}
					}
				}, 100);
			}
		});

		
		/* Do the move lad */

		scrolling.update();

		cryptoInit();

		if (isHistoryAvailable && history.replaceState) {
			history.replaceState({}, '', '/' + getUrlState());
		}
		processUrlState();

		if (window.Notification) {
			Notification.requestPermission();
		}
	}])
;
