var
	addMessageToChat,
	changeState,
	closeChat,
	isMobile,
	notify,
	platformString,
	sendMessage,
	state,
	states,
	statusNotFound
;

angular.
	module('Cyph', ['ngMaterial', 'ngSanitize', 'btford.markdown']).
	controller('CyphController', ['$scope', '$mdSidenav', function($scope, $mdSidenav) {
		$scope.isAlive	= true;

		$scope.messages	= [];

		$scope.message	= '';

		$scope.unreadMessages	= 0;

		states = $scope.states = {
			none: 0,
			spinningUp: 1,
			waitingForFriend: 2,
			settingUpCrypto: 3,
			chat: 200,
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


		addMessageToChat = $scope.addMessageToChat = function (text, author) {
			if (text) {
				switch (author) {
					case authors.friend:
						notify('New message!');
						break;

					case authors.app:
						notify(text);
						break;
				}

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
						author: author == authors.me ? 'me' : author == authors.friend ? 'friend' : '',
						isFromApp: author == authors.app,
						text: text,
						timestamp: hour + ':' + minute + ampm
					});
				});
			}
		};

		changeState = $scope.changeState = function (state) {
			apply(function() {
				state = $scope.state = state;
			});
		};

		closeChat = $scope.closeChat = function () {
			if ($scope.isAlive) {
				addMessageToChat('This cyph has been disconnected.', authors.app);
				sendChannelData({Destroy: true});

				apply(function() {
					$scope.isAlive	= false;
				});
			}
		};

		sendMessage = $scope.sendMessage = function () {
			var message	= $scope.message;

			apply(function() {
				$scope.message	= '';
			});

			if (message) {
				addMessageToChat(message, authors.me);
				otr.sendMsg(message);
			}
		};


		$scope.disconnect	= function() {
			socket.close();
		};

		$scope.openMobileMenu	= function() {
			$mdSidenav('menu').toggle();
		};

		var $messageList	= $('#message-list');
		$scope.scrollDown	= function() {
			$messageList.animate({scrollTop: $messageList[0].scrollHeight}, 350);
		};

		$scope.showCyphertext	= function() {
			alert(
				'This feature hasn\'t been implemented yet, but it will ' +
				'briefly show the actual cyphertext as proof that the chat ' +
				'is encrypted.'
			);
		};

		$scope.twoFactor	= function() {
			alert(
				'This feature hasn\'t been implemented yet, but it will ' +
				'freeze the chat until both users have verified their ' +
				'identities via two-factor authentication.'
			);
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

		$.fn.tap	= function (callback, onOrOff) {
			var $this		= $(this);
			var eventName	= isMobile ? 'touchstart' : 'click';

			if (onOrOff === false) {
				$this.off(eventName, callback);
			}
			else {
				$this.on(eventName, callback);
			}
		}


		$('.' + platformString + '-only [deferred-src]').each(function () {
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


		/* Notifications */

		var notifyTitle			= 'Cyph';
		var notifyIcon			= '/img/favicon/apple-touch-icon-180x180.png';
		var notifyAudio			= new Audio('/audio/beep.wav');
		var openNotifications	= [];

		notify	= function (message) {
			if (Visibility.hidden()) {
				if (window.Notification) {
					var notification	= new Notification(notifyTitle, {body: message, icon: notifyIcon});

					openNotifications.push(notification);

					notification.onclose	= function () {
						while (openNotifications.length > 0) {
							openNotifications.pop().close();
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

		function setUpFullScreenEvent () {
			function fullScreen () {
				if (screenfull.enabled && !screenfull.isFullscreen && $scope.state == $scope.states.chat) {
					screenfull.request();

					if (screenfull.isFullscreen) {
						$(window).tap(fullScreen, false);
					}
				}
			}

			$(window).tap(fullScreen, false).tap(fullScreen);
		}

		if (isMobile) {
			$('html').addClass('mobile');
			// setUpFullScreenEvent();
			// $(window).on('hide', setUpFullScreenEvent);
		}

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
		});

		cryptoInit();
		window.onpopstate();

		if (window.Notification) {
			Notification.requestPermission();
		}
	}])
;
