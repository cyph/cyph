module Cyph {
	export module UI {
		export class Affiliate {
			private static regex: RegExp	= /.*[\.\/]amazon.com\/.*\/([A-Za-z0-9]{10}).*/;


			public shouldAdd: boolean;

			public process ($elem: JQuery) : void {
				$elem.find('a').addBack().click(e => {
					let originalUrl: string	= $(e.currentTarget).attr('href') || '';

					if (originalUrl.substring(0, 5) === 'data:') {
						return;
					}

					let asin: string	= (originalUrl.match(Affiliate.regex) || [])[1] || '';

					if (asin) {
						e.preventDefault();

						let affiliateUrl: string	=
							'https://www.amazon.com/dp/' +
							asin +
							'?tag=' +
							Config.amazonAffiliateCode
						;

						let openAmazonUrl	= (ok: boolean) : void => {
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

			public constructor (private dialogManager: IDialogManager) {}
		}
	}
}
