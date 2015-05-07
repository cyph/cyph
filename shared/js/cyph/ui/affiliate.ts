module Cyph {
	export module UI {
		/**
		 * Handles affiliate URLs for potential monetisation/pseudo-donations.
		 */
		export class Affiliate {
			private static regex: RegExp	= /.*[\.\/]amazon.com\/.*\/([A-Za-z0-9]{10}).*/;


			/** Indicates a saved preference on whether to add our affiliate code. */
			public shouldAdd: boolean;

			/**
			 * Process all potential affiliate links within $elem.
			 * @param
			 */
			public process ($elem: JQuery) : void {
				$elem.find('a').addBack().click(e => {
					const originalUrl: string	= $(e.currentTarget).attr('href') || '';

					if (!originalUrl || originalUrl.substring(0, 5) === 'data:') {
						return;
					}

					const asin: string	= (originalUrl.match(Affiliate.regex) || [])[1] || '';

					if (asin) {
						e.preventDefault();

						const affiliateUrl: string	=
							'https://www.amazon.com/dp/' +
							asin +
							'?tag=' +
							Config.amazonAffiliateCode
						;

						const openAmazonUrl	= (ok: boolean) : void => {
							Util.openUrl(ok ? affiliateUrl : originalUrl);
						};


						if (this.shouldAdd === true || this.shouldAdd === false) {
							openAmazonUrl(this.shouldAdd);
						}
						else {
							this.dialogManager.baseDialog(
								{
									template: Templates.amazonLink,
									vars: {
										remember: false
									}
								},
								(ok: boolean, vars: any) => {
									if (vars.remember) {
										this.shouldAdd	= ok;
									}

									openAmazonUrl(ok);
								}
							);
						}
					}
				});
			}

			/**
			 * @param dialogManager
			 */
			public constructor (private dialogManager: IDialogManager) {}
		}
	}
}
