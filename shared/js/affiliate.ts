var affiliate	= {
	shouldAdd: null,

	process: function ($elem, $mdDialog) {
		$elem.find('a').click(function (e) {
			var originalUrl	= $(this).attr('href') || '';

			if (originalUrl.substring(0, 5) == 'data:') {
				return;
			}

			var asin	= (originalUrl.match(/.*amazon.com\/.*\/([A-Za-z0-9]{10}).*/) || [])[1];

			if (asin) {
				e.preventDefault();

				var affiliateUrl	= 'https://www.amazon.com/dp/' + asin + '?tag=cyph-20';
				var openAmazonUrl	= function (ok) { util.openUrl(ok ? affiliateUrl : originalUrl) };

				if (affiliate.shouldAdd === null) {
					$mdDialog.show({
						template: $('#templates > .amazon-link')[0].outerHTML,
						controller: ['$scope', '$mdDialog', function ($scope, $mdDialog) {
							$scope.remember	= false;

							$scope.close	= function (ok) {
								if ($scope.remember) {
									affiliate.shouldAdd	= ok;
								}

								$mdDialog.hide();
								openAmazonUrl(ok);

								if (ok) {
									anal.send({
										hitType: 'event',
										eventCategory: 'affiliate',
										eventAction: 'approve',
										eventValue: 1
									});
								}
							};
						}],

						/* Temporary hack for Angular Material bug */
						onComplete: function () {
							if (env.isMobile) {
								$('.amazon-link:visible md-checkbox').click(function () {
									var $this	= $(this);

									try {
										$this.css('pointer-events', 'none');
									}
									finally {
										setTimeout(function () {
											$this.css('pointer-events', '');
										}, 500);
									}
								});
							}
						}
					});
				}
				else {
					openAmazonUrl(affiliate.shouldAdd);
				}
			}
		});
	}
};
