import {Templates} from '../templates';
import {Config} from '../../config';
import {Env} from '../../env';
import {Util} from '../../util';


/**
 * Angular component for Braintree payment checkout UI.
 */
export class Checkout {
	/** Module/component title. */
	public static title: string	= 'cyphCheckout';

	private Cyph: any;
	private ui: any;
	private amount: string;
	private category: string;
	private email: string;
	private item: string;
	private name: string;
	private complete: boolean;

	constructor ($scope, $element, $attrs) {
		Util.retryUntilComplete(async (retry) => {
			this.Cyph	= self['Cyph'];
			this.ui		= self['ui'];

			if (!this.Cyph || !this.ui) {
				retry();
				return;
			}

			const token: string	= await Util.request({
				url: Env.baseUrl + Config.braintreeConfig.endpoint,
				retries: 5
			});

			const checkoutUI: JQuery	= $element.find('.braintree');

			checkoutUI.html('');

			self['braintree'].setup(token, 'dropin', {
				container: checkoutUI[0],
				enableCORS: true,
				onPaymentMethodReceived: async (data) => {
					const response: string	= await Util.request({
						url: Env.baseUrl + Config.braintreeConfig.endpoint,
						method: 'POST',
						data: {
							Nonce: data.nonce,
							Amount: Math.floor(parseFloat(this.amount) * 100),
							Category: this.category,
							Item: this.item,
							Name: this.name,
							Email: this.email
						}
					});

					if (JSON.parse(response).Status === 'authorized') {
						this.complete	= true;
						this.ui.controller.update();
					}
				}
			});
		});
	}

	private static _	= (() => {
		angular.module(Checkout.title, []).component(Checkout.title, {
			bindings: {
				amount: '=',
				category: '=',
				email: '=',
				item: '=',
				name: '='
			},
			controller: Checkout,
			transclude: true,
			template: Templates.checkout
		});
	})();
}
