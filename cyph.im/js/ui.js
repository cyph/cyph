var addMessageToChat, beginChat, closeChat, sendMessage, statusNotFound;

angular.module('Cyph', []).controller('CyphController', ['$scope', function($scope) {
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
				$scope.messages.push({
					author: author == authors.me ? 'me' : author == authors.friend ? 'friend' : '',
					isFromApp: author == authors.app,
					text: text,
					timestamp: Date.create().format('{12hr}:{mm}{tt}')
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
		addMessageToChat('friend has terminated chat', authors.app);

		apply(function() {
			$scope.isAlive	= false;
		});
	};

	sendMessage = $scope.sendMessage = function () {
		addMessageToChat($scope.message, authors.me);
		otr.sendMsg($scope.message);

		apply(function() {
			$scope.message	= '';
		});
	};

	statusNotFound = $scope.statusNotFound = function () {
		apply(function() {
			$scope.state	= $scope.states.error;
		});
	};
}]);
