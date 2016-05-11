import {Templates} from 'templates';
import {Config} from 'cyph/config';
import {Env} from 'cyph/env';
import {Util} from 'cyph/util';


/**
 * Angular directive for Braintree payment checkout UI component.
 */
export class Checkout {
	/** Module/directive title. */
	public static title: string	= 'cyphCheckout';

	private static _	= (() => {
		angular.module(Checkout.title, []).directive(Checkout.title, () => ({
			restrict: 'E',
			replace: false,
			template: Templates.checkout,
			link: (scope, element, attrs) => {
				Util.retryUntilComplete(retry => {
					const ui: any	= self['ui'];

					if (!ui) {
						setTimeout(retry, 250);
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

					Util.request({
						url: Env.baseUrl + Config.braintreeConfig.endpoint,
						success: (token: string) => {
							const checkoutUI: JQuery	= element.find('.checkout-ui');

							checkoutUI.html('');

							self['braintree'].setup(token, 'dropin', {
								container: checkoutUI[0],
								onPaymentMethodReceived: data => {
									Util.request({
										url: Env.baseUrl + Config.braintreeConfig.endpoint,
										method: 'POST',
										data: {
											Nonce: data.nonce,
											Amount: Math.floor(parseFloat(scope['amount']) * 100),
											Category: scope['category'],
											Item: scope['item'],
											Name: scope['name'],
											Email: scope['email']
										},
										success: (response) => {
											if (JSON.parse(response).Status === 'authorized') {
												scope['complete']	= true;
												self['ui'].controller.update();
											}
										}
									});
								}
							});
						}
					});
				});
			}
		}));
	})();
}
