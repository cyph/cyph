var addMessageToChat, beginChat, closeChat, sendMessage, statusNotFound;

angular.module('Cyph', ['mobile-angular-ui']).controller('CyphController', ['$scope', function($scope) {
	$scope.isAlive	= true;

	$scope.messages	= [];

	$scope.message	= '';

	$scope.states	= {
		loading: 0,
		chat: 200,
		error: 404
	};

	$scope.state	= $scope.states.loading;


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

				if (hour > 12) {
					hour	-= 12;
					ampm	= 'pm';
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

	beginChat = $scope.beginChat = function () {
		apply(function() {
			$scope.state	= $scope.states.chat;
		});
	};

	closeChat = $scope.closeChat = function () {
		addMessageToChat('This cyph has been disconnected.', authors.app);

		apply(function() {
			$scope.isAlive	= false;
		});
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

	statusNotFound = $scope.statusNotFound = function () {
		apply(function() {
			$scope.state	= $scope.states.error;
		});
	};
}]);
