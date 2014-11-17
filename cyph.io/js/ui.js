angular.
	module('Cyph', ['ngMaterial']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', function($scope, $mdSidenav, $mdToast) {
		var $body				= $('#main > :first-child');
		var $heroSection		= $('#hero-section');
		var $heroText			= $('#hero-text');
		var $newCyph			= $('#new-cyph');
		var $newCyphShadow		= $('#new-cyph-shadow');
		var $bouncingDownArrow	= $('#bouncing-down-arrow');
		var $fixedHeaderStuff	= $newCyph.add('#main-toolbar').add($bouncingDownArrow);
		var fixedHeaderClass	= 'fixed-header';



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


		$scope.scrollDown	= function() {
			$heroText.removeClass('bounceInDown').addClass('bounceOutRight');

			setTimeout(function () {
				$body.animate({
					scrollTop: $heroSection[0].scrollHeight
				}, 1000);

				setTimeout(function () {
					$heroText.removeClass('bounceOutRight').addClass('bounceInDown');
				}, 1000);
			}, 250);
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



		/* Header / new cyph button animation */

		$body.scroll(function () {
			var viewportHeight	= Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
			var scrollTop		= this.scrollTop;

			if (scrollTop == 0) {
				$newCyph.css({transform: '', top: ''});
				$fixedHeaderStuff.removeClass(fixedHeaderClass);
			}
			else if (scrollTop >= parseInt($newCyphShadow.css('top'), 10)) {
				$fixedHeaderStuff.addClass(fixedHeaderClass);
				$newCyph.css({transform: '', top: ''});
			}
			else {
				$fixedHeaderStuff.removeClass(fixedHeaderClass);

				var ratio	= (viewportHeight - scrollTop) / viewportHeight;

				if (ratio > 0.62) {
					$newCyph.css('transform', 'scale(' + ratio + ')');
				}
			}
		});

		setInterval(function () {
			$bouncingDownArrow.removeClass('bounce');

			setTimeout(function () {
				$bouncingDownArrow.addClass('bounce');
			}, 100);
		}, 2500);


		
		/* Do the move lad */

		scrolling.update();

		/*
			$(function () {
				$('#pre-load').addClass('load-complete');
			});
		*/
	}])
;
