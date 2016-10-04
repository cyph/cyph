import {Templates} from 'ui/templates';
import {Config} from 'cyph/config';
import {Env} from 'cyph/env';
import {Util} from 'cyph/util';


/**
 * Angular component for Braintree payment checkout UI.
 */
export class Checkout {
	/** Module/component title. */
	public static title: string	= 'cyphCheckout';

	private static _	= (() => {
		angular.module(Checkout.title, []).directive(Checkout.title, () => ({
			restrict: 'E',
			replace: false,
			transclude: true,
			template: Templates.checkout,
			link: (scope, element, attrs) => Util.retryUntilComplete(async (retry) => {
				const ui: any	= self['ui'];

				if (!ui) {
					retry();
					return;
				}

				scope['ui']		= ui;
				scope['Cyph']	= self['Cyph'];

				const watch	= (attr: string) => scope.$watch(attrs[attr], (value: string) => {
					scope[attr]	= value;
					ui.controller.update();
				});

				watch('amount');
				watch('category');
				watch('item');

				const token: string	= await Util.request({
					url: Env.baseUrl + Config.braintreeConfig.endpoint,
					retries: 5
				});

				const checkoutUI: JQuery	= element.find('.braintree');

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
								Amount: Math.floor(parseFloat(scope['amount']) * 100),
								Category: scope['category'],
								Item: scope['item'],
								Name: scope['name'],
								Email: scope['email']
							}
						});

						if (JSON.parse(response).Status === 'authorized') {
							scope['complete']	= true;
							self['ui'].controller.update();
						}
					}
				});
			})
		}));
	})();
}
