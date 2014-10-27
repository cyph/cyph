var
	addMessageToChat,
	beginChat,
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
		$scope.language			= language;
		$scope.isAlive			= true;
		$scope.messages			= [];
		$scope.message			= '';
		$scope.unreadMessages	= 0;
		$scope.authors			= authors;

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


		var newMessageNotification	= getString('newMessageNotification');
		addMessageToChat = $scope.addMessageToChat = function (text, author) {
			if (text) {
				switch (author) {
					case authors.friend:
						notify(newMessageNotification);
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
						author: author,
						isFromApp: author == authors.app,
						isFromFriend: author == authors.friend,
						isFromMe: author == authors.me,
						text: text,
						timestamp: hour + ':' + minute + ampm
					});
				});
			}
		};

		beginChat = $scope.beginChat = function () {
			changeState(states.chat);

			/* Adjust font size for translations */
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
		};

		changeState = $scope.changeState = function (state) {
			apply(function() {
				state = $scope.state = state;
			});
		};

		var disconnectedNotification	= getString('disconnectedNotification');
		closeChat = $scope.closeChat = function () {
			if ($scope.isAlive) {
				addMessageToChat(disconnectedNotification, authors.app);
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
				if (isMobile) {
					$('#message-box').focus();
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

			if (isMobile) {
				$mdSidenav('menu').close();
			}
			/*if(!$messageList.hasClass('curtain')){*/
			/*$messageList.addClass('curtain');*/
			/*$('#cyphertext').addClass('active');*/
			/*}*/
			/*else {*/
			/*$messageList.removeClass('curtain');*/
			/*$('#cyphertext').removeClass('active');*/
			/*}*/
	     
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


		/* Notifications */

		var notifyTitle			= 'Cyph';
		var notifyIcon			= '/img/favicon/apple-touch-icon-180x180.png';
		var notifyAudio			= new Audio('/audio/beep.mp3');
		var disableNotify		= false;
		var openNotifications	= [];

		Visibility.change(function (e, state) {
			if (state != 'hidden') {
				disableNotify	= false;
			}
		});

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

		
		/* Do the move lad */

		window.onpopstate();

		if (window.Notification) {
			Notification.requestPermission();
		}
	}])
;
