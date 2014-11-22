angular.
	module('Cyph', ['ngMaterial']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', function ($scope, $mdSidenav, $mdToast) {
		var $window				= $(window);
		var $html				= $('html');
		var $body				= $('#main > :first-child');
		var $heroText			= $('#hero-text');
		var $newCyph			= $('#new-cyph');
		var $newCyphShadow		= $('#new-cyph-shadow');
		var $bouncingDownArrow	= $('#bouncing-down-arrow');
		var $video				= $('#background-video');
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

		if (isMobile) {
			$html.addClass('mobile');

			$video.find(':not(img)').remove();
		}
		else {
			$video.find('img').remove();
		}

		$video	= $video.children(':first-child');



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



		$scope.baseButtonClick	= function () {
			$mdSidenav('menu').close();
		};


		$scope.openMobileMenu	= function () {
			$mdSidenav('menu').open();
		};


		$scope.scrollDown	= function () {
			$heroText.removeClass('bounceInDown').addClass('bounceOutRight');

			setTimeout(function () {
				$body.animate({
					scrollTop: $window.height()
				}, 1000);

				setTimeout(function () {
					$heroText.removeClass('bounceOutRight').addClass('bounceInDown');
				}, 250);
			}, 250);
		};



		/* OS X-style scrollbars */

		scrolling	= {
			isNanoScroller: true, // !isMobile && navigator.userAgent.indexOf('mac os x') < 0,
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



		/* Background video dimensions */

		var videoAspectRatio		= 16 / 9;

		var logoHidePaddingWidth	= 150;
		var logoHidePaddingHeight	= (logoHidePaddingWidth / videoAspectRatio);

		function adjustVideoMargins () {
			var windowAspectRatio	= window.innerWidth / window.innerHeight;

			/* Zoom in to hide YouTube logo when potentially visible; else, just centre and scale */
			if (!isMobile && 0.2 > Math.abs(videoAspectRatio - windowAspectRatio)) {
				$video.css({
					'height': window.innerHeight + logoHidePaddingHeight,
					'width': window.innerWidth + logoHidePaddingWidth,
					'margin-top': 0 - (logoHidePaddingHeight / 2),
					'margin-left': 0 - (logoHidePaddingWidth / 2)
				});
			}
			else if (windowAspectRatio > videoAspectRatio) {
				var height	= $video.width() / videoAspectRatio;

				$video.css({
					'height': height,
					'width': 0,
					'margin-top': 0 - ((height - window.innerHeight) / 2),
					'margin-left': 0
				});
			}
			else if (windowAspectRatio < videoAspectRatio) {
				var width	= videoAspectRatio * $video.height();

				$video.css({
					'height': 0,
					'width': width,
					'margin-top': 0,
					'margin-left': 0 - ((width - window.innerWidth) / 2)
				});
			}
		}

		$(adjustVideoMargins);
		$window.on('resize', adjustVideoMargins);



		/* Do the move lad */

		scrolling.update();

		/*
			$(function () {
				$('#pre-load').addClass('load-complete');
			});
		*/
	}])
;
