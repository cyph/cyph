var addMessageToChat, changeState, closeChat, isMobile, sendMessage, state, states, statusNotFound;

angular.module('Cyph', ['ngMaterial']).controller('CyphController', ['$scope', function($scope) {
	$scope.isAlive	= true;

	$scope.messages	= [];

	$scope.message	= '';

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


	isMobile	= (localStorage && localStorage.forceMobile && localStorage.forceMobile != 'false') || (function () {
		try {
			document.createEvent('TouchEvent');
			return true;
		}
		catch (e) {
			return false;
		}
	}());


	/* onenterpress attribute handler */

	$('[onenterpress]').each(function () {
		var $this			= $(this);
		var enterpressOnly	= $this.attr('enterpress-only');

		if (!enterpressOnly || enterpressOnly == (isMobile ? 'mobile' : 'desktop')) {
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


	/* Init */

	function setUpFullScreenEvent () {
		function fullScreen () {
			if (screenfull.enabled && !screenfull.isFullscreen && state == states.chat) {
				screenfull.request();
				$(window).off('click', fullScreen);
			}
		}

		$(window).off('click', fullScreen);
		$(window).click(fullScreen);
	}

	if (isMobile) {
		$('html').addClass('mobile');
		setUpFullScreenEvent();
		$(document).on('hide', setUpFullScreenEvent);
	}

	cryptoInit();
	window.onpopstate();

	$('#loading').hide();
}]);
