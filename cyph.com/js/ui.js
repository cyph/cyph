var openPodcast, openAbout, openFaq, openTos, openPrivacyPolicy, openError;


angular.
	module('Cyph', ['ngMaterial']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', function ($scope, $mdSidenav, $mdToast) {
		var $window				= $(window);
		var $html				= $('html');
		var $body				= $html.add($('body'));
		var $betaSignup			= $('.beta-signup');
		var $betaSignupForm		= $('.beta-signup-form');
		var $podcastLogo		= $('.podcast-logo');
		var $heroText			= $('.hero-text');
		var $newCyph			= $('#new-cyph');
		var $newCyphParent		= $newCyph.parent();
		var $bouncingDownArrow	= $('#bouncing-down-arrow');
		var $video				= $('#background-video > :first-child');
		var $founderPhotos		= $('.founder-photos');
		var $ryanPhoto			= $founderPhotos.children(':nth-child(1)');
		var $joshPhoto			= $founderPhotos.children(':nth-child(2)');
		var $fixedHeaderStuff	= $newCyph.add('#main-toolbar').add($bouncingDownArrow);
		var fixedHeaderClass	= 'fixed-header';


		$scope.isAbout			= false;
		$scope.isError			= false;
		$scope.isFaq			= false;
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

		openFaq	= $scope.openFaq = function (isFaq) {
			apply(function () {
				$scope.isFaq	= isFaq;
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
		}

		if (isMobile) { // || location.hostname == 'localhost') {
			var $mobilePoster	= $('<img />');
			$mobilePoster.attr('src', $video.attr('mobile-poster'));
			$video.replaceWith($mobilePoster);
			$video				= $mobilePoster;
		}



		$('md-button').tap(function () {
			setTimeout(function () {
				$('md-button, md-button *').blur();
			}, 500);
		});



		/* Header / new cyph button animation */

		var founderPhotosOffset;
		setTimeout(function () {
			founderPhotosOffset	= founderPhotosOffset	= $founderPhotos.offset().top - 500;
		}, 1000);

		$window.scroll(function () {
			var viewportHeight	= Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
			var scrollTop		= window.pageYOffset;

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

			if (founderPhotosOffset && (scrollTop >= founderPhotosOffset)) {
				$ryanPhoto.addClass('bounceInLeft');
				$joshPhoto.addClass('bounceInRight');

				founderPhotosOffset	= undefined;
			}
		});

		setInterval(function () {
			$bouncingDownArrow.removeClass('bounce');

			setTimeout(function () {
				$bouncingDownArrow.addClass('bounce');
			}, 100);
		}, 2500);



		/* Background video dimensions */

		var addressBarHeight		= 60;
		var videoAspectRatio		= 16 / 9;

		var logoHidePaddingWidth	= 150;
		var logoHidePaddingHeight	= (logoHidePaddingWidth / videoAspectRatio);

		var previousAspectRatio;
		var previousHeight			= window.innerHeight;

		function adjustVideoMargins () {
			var heightDelta			= window.innerHeight - previousHeight;
			var isAddressBarHidden	= heightDelta > 0 && heightDelta < 75;
			previousHeight			= window.innerHeight;

			var windowAspectRatio	= window.innerWidth / window.innerHeight;
			var aspectRatio			= windowAspectRatio > videoAspectRatio;

			if (aspectRatio == previousAspectRatio && isAddressBarHidden) {
				return;
			}

			previousAspectRatio		= aspectRatio;

			if (aspectRatio) {
				var height	= window.innerWidth / videoAspectRatio;

				$video.css({
					'height': height,
					'width': window.innerWidth,
					'margin-top': 0 - ((height - window.innerHeight) / 2) + (addressBarHeight / 2),
					'margin-left': 0
				});
			}
			else {
				var height	= window.innerHeight + addressBarHeight;
				var width	= videoAspectRatio * height;

				$video.css({
					'height': height,
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
