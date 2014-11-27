var openPodcast, openAbout, openTos, openPrivacyPolicy, openError;


angular.
	module('Cyph', ['ngMaterial']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', function ($scope, $mdSidenav, $mdToast) {
		var $window				= $(window);
		var $html				= $('html');
		var $body				= $('body');
		var $betaSignup			= $('.beta-signup');
		var $betaSignupForm		= $('.beta-signup-form');
		var $podcastLogo		= $('.podcast-logo');
		var $heroText			= $('.hero-text');
		var $newCyph			= $('#new-cyph');
		var $newCyphParent		= $newCyph.parent();
		var $bouncingDownArrow	= $('#bouncing-down-arrow');
		var $video				= $('#background-video');
		var $fixedHeaderStuff	= $newCyph.add('#main-toolbar').add($bouncingDownArrow);
		var fixedHeaderClass	= 'fixed-header';


		$scope.isAbout			= false;
		$scope.isError			= false;
		$scope.isPrivacyPolicy	= false;
		$scope.isTos			= false;
		$scope.podcast			= '';



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



		openPodcast	= $scope.openPodcast = function (podcast) {
			apply(function () {
				$scope.podcast	= podcast || '';
			});

			$heroText.hide();
			podcast && $podcastLogo.attr('src', '/img/' + podcast + '.png');
			setTimeout(function () { $heroText.show() }, 1);
		};

		openAbout	= $scope.openAbout = function (isAbout) {
			apply(function () {
				$scope.isAbout	= isAbout;
			});
		};

		openTos	= $scope.openTos = function (isTos) {
			apply(function () {
				$scope.isTos	= isTos;
			});
		};

		openPrivacyPolicy	= $scope.openPrivacyPolicy = function (isPrivacyPolicy) {
			apply(function () {
				$scope.isPrivacyPolicy	= isPrivacyPolicy;
			});
		};

		openError	= $scope.openError = function (isError) {
			apply(function () {
				$scope.isError	= isError;
			});
		};



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



		if (isMobile) {
			$html.addClass('mobile');

			$video.children(':not(img)').remove();
		}
		else {
			$video.children('img').remove();
		}

		$video	= $video.children(':first-child');



		$('md-button').tap(function () {
			setTimeout(function () {
				$('md-button, md-button *').blur();
			}, 500);
		});



		/* Header / new cyph button animation */

		$window.scroll(function () {
			var viewportHeight	= Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
			var scrollTop		= document.body.scrollTop;

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



		/***** Beta signup stuff *****/

		$scope.betaSignupState	= 0;

		$scope.betaSignup		= {
			Language: languagePair[0],
			Country: languagePair[1]
		};

		$scope.submitBetaSignup	= function () {
			apply(function () {
				++$scope.betaSignupState;
			});

			if ($scope.betaSignupState == 2) {
				setTimeout(function () {
					apply(function () {
						++$scope.betaSignupState;
					});
				}, 1500);
			}

			setTimeout(function () {
				$($betaSignupForm.find('input:visible')[0]).focus();
			}, 100);

			var retries	= 0;
			function dothemove () {
				$.ajax({
					type: 'PUT',
					url: BASE_URL + 'betasignups',
					data: $scope.betaSignup,
					error: function () {
						if (++retries < 5) {
							dothemove();
						}
						else {
							retries	= 0;
						}
					}
				});
			}

			dothemove();
		};

		setTimeout(function () {
			$betaSignupForm.addClass('visible');
		}, 500);



		/* Do the move lad */

		if (isHistoryAvailable && history.replaceState) {
			history.replaceState({}, '', '/' + getUrlState());
		}
		processUrlState();

		$(function () {
			$('html').addClass('load-complete');
		});
	}])
;
