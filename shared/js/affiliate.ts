/// <reference path="analytics.ts" />
/// <reference path="env.ts" />
/// <reference path="globals.ts" />
/// <reference path="util.ts" />
/// <reference path="../lib/typings/angular-material/angular-material.d.ts" />
/// <reference path="../lib/typings/jquery/jquery.d.ts" />


class Affiliate {
	public static shouldAdd: boolean;

	public static process ($elem: JQuery, $mdDialog: angular.material.MDDialogService) : void {
		$elem.find('a').click(e => {
			let originalUrl: string	= $(e.currentTarget).attr('href') || '';

			if (originalUrl.substring(0, 5) == 'data:') {
				return;
			}

			let asin: string	= (originalUrl.match(/.*amazon.com\/.*\/([A-Za-z0-9]{10}).*/) || [])[1] || '';

			if (asin) {
				e.preventDefault();

				let affiliateUrl: string	= 'https://www.amazon.com/dp/' + asin + '?tag=cyph-20';

				function openAmazonUrl (ok: boolean) : void {
					Util.openUrl(ok ? affiliateUrl : originalUrl);
				}


				if (Affiliate.shouldAdd === true || Affiliate.shouldAdd === false) {
					openAmazonUrl(Affiliate.shouldAdd);
				}
				else {
					$mdDialog.show({
						template: $('#templates > .amazon-link')[0].outerHTML,
						controller: ['$scope', '$mdDialog', ($scope, $mdDialog) => {
							$scope.remember	= false;

							$scope.close	= (ok: boolean) => {
								if ($scope.remember) {
									Affiliate.shouldAdd	= ok;
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
						onComplete: () => {
							if (Env.isMobile) {
								$('.amazon-link:visible md-checkbox').click(e => {
									let $this: JQuery	= $(e.currentTarget);

									try {
										$this.css('pointer-events', 'none');
									}
									finally {
										setTimeout(() =>
											$this.css('pointer-events', '')
										, 500);
									}
								});
							}
						}
					});
				}
			}
		});
	}
}
