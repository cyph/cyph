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
			restrict: 'A',
			replace: true,
			template: Templates.checkout,
			link: (scope, element, attrs) => {
				const set	= (amount: string) => {
					scope['amount']	= amount;

					const checkoutUI: JQuery	= element.find('.checkout-ui');

					checkoutUI.html('');

					Util.request({
						url: Env.baseUrl + Config.braintreeConfig.endpoint,
						success: (token: string) =>
							self['braintree'].setup(token, 'dropin', {
								container: checkoutUI[0],
								onPaymentMethodReceived: data => {
									Util.request({
										url: Env.baseUrl + Config.braintreeConfig.endpoint,
										method: 'POST',
										data: {
											Nonce: data.nonce,
											Amount: Math.floor(parseFloat(amount) * 100)
										},
										success: (response) => {
											if (JSON.parse(response).Status === 'authorized') {
												scope['complete']	= true;
												self['ui'].controller.update();
											}
										}
									});
								}
							})
						}
					)
				};

				scope.$watch(attrs[Checkout.title], set);
			}
		}));
	})();
}
