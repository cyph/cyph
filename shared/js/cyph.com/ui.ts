let openPodcast, openAbout, openFaq, openTos, openPrivacyPolicy, openError;


angular.
	module('Cyph', ['ngMaterial']).
	controller('CyphController', ['$scope', '$mdSidenav', '$mdToast', function ($scope, $mdSidenav, $mdToast) {
		let $window				= $(window);
		let $html				= $('html');
		let $body				= $html.add($('body'));
		let $betaSignup			= $('.beta-signup');
		let $betaSignupForm		= $('.beta-signup-form');
		let $podcastLogo		= $('.podcast-logo');
		let $heroText			= $('#hero-section .hero-text');
		let $featureListItems	= $('.feature-list-item');
		let $newCyph			= $('#new-cyph');
		let $newCyphParent		= $newCyph.parent();
		let $bouncingDownArrow	= $('#bouncing-down-arrow');
		let $video				= $('#background-video > :first-child');
		let $founderPhotos		= $('.founder-photos');
		let $ryanPhoto			= $founderPhotos.children(':nth-child(1)');
		let $joshPhoto			= $founderPhotos.children(':nth-child(2)');
		let $fixedHeaderStuff	= $newCyph.add('#main-toolbar').add($bouncingDownArrow);
		let fixedHeaderClass	= 'fixed-header';


		$scope.isAbout			= false;
		$scope.isError			= false;
		$scope.isFaq			= false;
		$scope.isPrivacyPolicy	= false;
		$scope.isTos			= false;
		$scope.podcast			= '';
		$scope.isOnion			= Env.isOnion;



		/* https://coderwall.com/p/ngisma */
		function apply (fn) {
			let phase = $scope['$root']['$$phase'];

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



		if (Env.isMobile) {
			$html.addClass('mobile');
		}

		if (Env.isMobile || Env.isOnion) {
			let $mobilePoster	= $('<img />');
			$mobilePoster.attr('src', $video.attr('mobile-poster'));
			$video.replaceWith($mobilePoster);
			$video				= $mobilePoster;
		}



		/* Header / new cyph button animation */

		if (Env.isMobile) {
			$fixedHeaderStuff.addClass(fixedHeaderClass);
		}
		else {
			$window.scroll(function () {
				let viewportHeight	= Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
				let scrollTop		= window.pageYOffset;

				if (scrollTop == 0) {
					$newCyph.css({transform: '', top: ''});
					$fixedHeaderStuff.removeClass(fixedHeaderClass);
				}
				else if (scrollTop >= ($newCyphParent.height() / 2 + 16)) {
					$fixedHeaderStuff.addClass(fixedHeaderClass);
				}
				else {
					$fixedHeaderStuff.removeClass(fixedHeaderClass);

					let ratio	= (viewportHeight - scrollTop) / viewportHeight;

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
		}



		/* Background video dimensions */

		let addressBarHeight		= 60;
		let videoAspectRatio		= 16 / 9;

		let logoHidePaddingWidth	= 150;
		let logoHidePaddingHeight	= (logoHidePaddingWidth / videoAspectRatio);

		let previousAspectRatio;
		let previousHeight			= window.innerHeight;

		let pullInterval;

		function adjustVideoMargins () {
			if (!Env.isMobile || Env.isTablet) {
				$featureListItems.css('height', '');
				$featureListItems.find('[class*="pull"]').css('left', '');

				setTimeout(function () {
					[[0, 3], [1, 4], [2, 5]].forEach(function (pair) {
						let $a	= $featureListItems.eq(pair[0]);
						let $b	= $featureListItems.eq(pair[1]);

						$a.add($b).height(Math.max($a.height(), $b.height()));
					});

					clearInterval(pullInterval);
					let pullInterval	= setInterval(function () {
						let $pulledElements	= $featureListItems.filter('.animated').find('[class*="pull"]');

						setTimeout(function () {
							$pulledElements.each(function () {
								let $this	= $(this);
								let offset	= $this.offset();

								if (offset.left < 0) {
									$this.css('left', '0px');
								}
							});
						}, 2500);
					}, 2500);
				}, 250);
			}


			let heightDelta			= window.innerHeight - previousHeight;
			let isAddressBarHidden	= heightDelta > 0 && heightDelta < 75;
			previousHeight			= window.innerHeight;

			let windowAspectRatio	= window.innerWidth / window.innerHeight;
			let aspectRatio			= windowAspectRatio > videoAspectRatio;

			if (aspectRatio == previousAspectRatio && isAddressBarHidden) {
				return;
			}

			previousAspectRatio		= aspectRatio;

			if (aspectRatio) {
				let height	= window.innerWidth / videoAspectRatio;

				$video.css({
					'height': height,
					'width': window.innerWidth,
					'margin-top': 0 - ((height - window.innerHeight) / 2) + (addressBarHeight / 2),
					'margin-left': 0
				});
			}
			else {
				let height	= window.innerHeight + addressBarHeight;
				let width	= videoAspectRatio * height;

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
			Language: language
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
				/* Temporary workaround */
				let $input	= $betaSignupForm.find('input:visible');
				if ($input.length == 1) {
					$input.focus();
				}
			}, 100);

			let retries	= 0;
			function dothemove () {
				Util.request({
					method: 'PUT',
					url: Env.baseUrl + 'betasignups',
					data: $scope.betaSignup,
					error: function () {
						if (++retries < 5) {
							dothemove();
						}
						else {
							retries	= 0;
						}
					},
					success: function (isNew) {
						if (isNew == 'true') {
							Analytics.main.send({
								hitType: 'event',
								eventCategory: 'signup',
								eventAction: 'new',
								eventValue: 1
							});
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

		if (typeof history != 'undefined' && history.replaceState) {
			history.replaceState({}, '', '/' + Util.getUrlState());
		}
		processUrlState();

		$(function () {
			$('html').addClass('load-complete');

			let wowDelay			= 'data-wow-delay';
			let platformWowDelay	= Env.platformString + '-' + wowDelay;
			$('[' + platformWowDelay + ']').each(function () {
				let $this	= $(this);
				$this.attr(wowDelay, $this.attr(platformWowDelay));
			});

			let platformClass	= Env.platformString + '-class-';
			$('[class*="' + platformClass + '"]').each(function () {
				let $this	= $(this);
				$this.attr('class', $this.attr('class').replace(new RegExp(platformClass, 'g'), ''));
			});

			if (!Env.isMobile) {
				new WOW({live: false}).init();
			}
		});
	}])
;
