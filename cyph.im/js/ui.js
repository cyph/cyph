var
	abortSetup,
	addMessageToChat,
	beginChatUi,
	beginWaiting,
	changeState,
	closeChat,
	friendIsTyping,
	iAmBanned,
	insertPhoto,
	isAlive,
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


/* Stuff for ng-markdown directive */

var markdown	= new markdownit({
	html: false,
	linkify: true,
	typographer: true,
	quotes: (language == 'ru' ? '«»' : language == 'de' ? '„“' : '“”') + '‘’',
	highlight: function (str, lang) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(lang, str).value;
			}
			catch (__) {}
		}

		try {
			return hljs.highlightAuto(str).value;
		}
		catch (__) {}

		return '';
	}
}).
	disable('image').
	use(markdownitSup).
	use(markdownitEmoji)
;

markdown.renderer.rules.emoji	= function(token, idx) {
	return twemoji.parse(token[idx].to, {base: '/lib/bower_components/twemoji/'});
};


angular.
	module('Cyph', ['ngMaterial', 'timer']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', '$mdDialog', function ($scope, $mdSidenav, $mdToast, $mdDialog) {
		var $window				= $(window);
		var $html				= $('html');
		var $everything			= $('*');
		var $messageBox			= $('#message-box');
		var $messageList		= $('#message-list, #message-list > md-content');
		var $timer				= $('#timer');
		var $buttons			= $('.md-button');
		var $copyUrl			= $('#copy-url input');
		var $cyphertext			= $('#cyphertext.curtain, #cyphertext.curtain > md-content');

		$scope.language			= language;
		$scope.isConnected		= false;
		$scope.isFriendTyping	= false;
		$scope.cyphertext		= [];
		$scope.messages			= [];
		$scope.message			= '';
		$scope.unreadMessages	= 0;
		$scope.authors			= authors;
		$scope.copyUrl			= '';

		isAlive = $scope.isAlive = true;

		states = $scope.states = {
			none: 0,
			spinningUp: 1,
			waitingForFriend: 2,
			chatBeginMessage: 3,
			blank: 4,
			chat: 200,
			aborted: 400,
			error: 404,
			banned: 666
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
			$window.off('beforeunload');
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
			$timer && $timer[0].stop();

			/* Stop mobile browsers from keeping this selected */
			$copyUrl.remove();

			setTimeout(function () {
				if ($scope.state == $scope.states.aborted) {
					return;
				}

				callback && callback();

				changeState($scope.states.chat);

				/* Adjust font size for translations */
				if (!isMobile) {
					setTimeout(function () {
						$buttons.each(function () {
							var $this		= $(this);
							var $clone		= $this
								.clone()
								.css({display: 'inline', width: 'auto', visibility: 'hidden', position: 'fixed'})
								.appendTo('body')
							;
							var $both		= $this.add($clone);

							var fontSize	= parseInt($this.css('font-size'), 10);

							for (var i = 0 ; i < 20 && $clone.width() > $this.width() ; ++i) {
								fontSize	-= 1;
								$both.css('font-size', fontSize + 'px');
							}

							$clone.remove();
						});
					}, 500);
				}

				addMessageToChat(getString('introductoryMessage'), authors.app, false);
			}, 3000);
		};


		beginWaiting = $scope.beginWaiting = function () {
			changeState($scope.states.waitingForFriend);

			var copyUrl		=
				document.location.protocol + '//' +
				document.location.host.replace('www.', '') +
				'/#' +
				document.location.pathname.substr(1) +
				sharedSecret
			;

			function setCopyUrl () {
				if ($scope.copyUrl != copyUrl) {
					apply(function () {
						$scope.copyUrl	= copyUrl;
					});
				}
			}

			function selectCopyUrl () {
				$copyUrl[0].setSelectionRange(0, copyUrl.length);
			}

			var noMoreAutoFocus	= false;
			var copyUrlInterval	= setInterval(function () {
				if ($scope.state == $scope.states.waitingForFriend) {
					setCopyUrl();

					if (!noMoreAutoFocus) {
						$copyUrl.focus();
						selectCopyUrl();

						if (isFFMobile || (isMobile && !isAndroid)) {
							setTimeout(selectCopyUrl, 250);
							noMoreAutoFocus	= true;
						}
					}
				}
				else {
					clearInterval(copyUrlInterval);
				}
			}, 250);

			/* Temporary fix for iOS and mobile Firefox issue */
			if (isIOS) {
				var expireTime	= new Date(Date.now() + 600000).toLocaleTimeString().toLowerCase().replace(/(.*:.*):.*? /, '$1');
				$timer.parent().text('Link expires at ' + expireTime)
				delete $timer;
			}
			else {
				$timer[0].start();
			}
		};


		changeState = $scope.changeState = function (state) {
			if (isBanned) {
				return;
			}

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
					sendChannelDataBase({Destroy: true}, {callback: callback});

					apply(function () {
						isAlive = $scope.isAlive = false;
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


		iAmBanned = $scope.iAmBanned = function () {
			$window.off('beforeunload');
			sendChannelData({Destroy: true});
			changeState($scope.states.banned);

			isBanned	= true;
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
					$scope.cyphertext.push({author: author, text: JSON.parse(text).message});
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
				sendChannelData({Misc: imtypingyo ? channelDataMisc.imtypingyo : channelDataMisc.donetyping});
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
		else {
			var messageBoxLineHeight	= parseInt($messageBox.css('line-height'), 10);
			$messageBox.on('keyup', function () {
				$messageBox.height(messageBoxLineHeight * $messageBox.val().split('\n').length);
			});
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

					$html.find('img:not(.emoji)').each(function () {
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

		tabIndent.renderAll();

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
	}]).
	directive('ngMarkdown', function () {
		return {
			restrict: 'A',
			replace: true,
			link: function (scope, element, attrs) {
				function set(val) {
					val	= markdown.render(val);

					/* TODO: Get markdown-it team to implement these features natively */

					/* Merge blockquotes like reddit */
					val	= val.replace(/\<\/blockquote\>\n\<blockquote\>\n/g, '');

					/* Images */
					val	= val.replace(/!\<a href="(data:image\/.*?)"><\/a>/g, function (match, value) {
						return '<img src="' + value + '" />';
					});

					element.html(val);
				}

				set(scope.ngMarkdown || '');
				scope.$watch(attrs.ngMarkdown, set);
			}
		};
	});
;
