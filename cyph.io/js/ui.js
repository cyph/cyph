angular.
	module('Cyph', ['ngMaterial']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', function($scope, $mdSidenav, $mdToast) {
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



		isMobile	= (function () {
			try {
				document.createEvent('TouchEvent');
				return true;
			}
			catch (e) {
				return false;
			}
		}());


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



		$scope.baseButtonClick	= function() {
			$mdSidenav('menu').close();
		};


		$scope.openMobileMenu	= function() {
			$mdSidenav('menu').open();
		};



		/* OS X-style scrollbars */
		scrolling	= {
			isNanoScroller: !isMobile && navigator.userAgent.indexOf('mac os x') < 0,
			update: function () {
				if (this.isNanoScroller) {
					$('.nano').nanoScroller();
				}
			}
		};

		if (!scrolling.isNanoScroller) {
			$('.nano, .nano-content').removeClass('nano').removeClass('nano-content');
		}


		$('md-button').tap(function () {
			setTimeout(function () {
				$('md-button, md-button *').blur();
			}, 500);
		});


		
		/* Do the move lad */

		scrolling.update();

		/*
			$(function () {
				$('#pre-load').addClass('load-complete');
			});
		*/
	}])
;
