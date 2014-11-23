angular.
	module('Cyph', ['ngMaterial']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', function ($scope, $mdSidenav, $mdToast) {
		var $window				= $(window);
		var $html				= $('html');
		var $body				= $('#main > :first-child');
		var $betaSignup			= $('.beta-signup');
		var $heroText			= $('#hero-text');
		var $newCyph			= $('#new-cyph');
		var $newCyphParent		= $newCyph.parent();
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



		var isMobile	= (function () {
			try {
				document.createEvent('TouchEvent');
				return true;
			}
			catch (e) {
				return false;
			}
		}());

		var platformString	= isMobile ? 'mobile' : 'desktop';

		if (isMobile) {
			$html.addClass('mobile');

			$video.children(':not(img)').remove();
		}
		else {
			$video.children('img').remove();
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
			else if (scrollTop >= ($newCyphParent.height() / 2 + 16)) {
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

			if (windowAspectRatio > videoAspectRatio) {
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



		$('.' + platformString + '-only [deferred-src], [deferred-src].' + platformString + '-only').
			each(function () {
				var $this	= $(this);
				$this.attr('src', $this.attr('deferred-src'));
			})
		;




		/***** Beta signup stuff *****/

		var language		= (
			navigator.language ||
			navigator.userLanguage ||
			navigator.browserLanguage ||
			navigator.systemLanguage
		).toLowerCase().split('-');

		$scope.betaSignupState	= 0;

		$scope.betaSignup		= {
			Language: language[0],
			Country: language[1]
		};

		var retries	= 0;
		$scope.submitBetaSignup	= function () {
			$.ajax({
				type: 'PUT',
				url: 'https://api.cyph.com/betasignups',
				data: $scope.betaSignup,
				error: function () {
					if (++retries < 5) {
						$scope.submitBetaSignup();
					}
					else {
						retries	= 0;
					}
				},
				success: function () {
					apply(function () {
						++$scope.betaSignupState;
					});

					setTimeout(function () {
						document.location	= '/';
					}, 5000);
				}
			});
		};



		/* Do the move lad */

		scrolling.update();

		/*
			$(function () {
				$('#pre-load').addClass('load-complete');
			});
		*/
	}])
;
