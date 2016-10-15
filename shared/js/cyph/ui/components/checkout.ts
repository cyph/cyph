import {Templates} from '../templates';
import {Config} from '../../config';
import {Env} from '../../env';
import {Util} from '../../util';


/**
 * Angular component for Braintree payment checkout UI.
 */
export class Checkout {
	/** Component title. */
	public static title: string	= 'cyphCheckout';

	/** Component configuration. */
	public static config		= {
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
	};


	private Cyph: any;
	private ui: any;
	private amount: string;
	private category: string;
	private email: string;
	private item: string;
	private name: string;
	private complete: boolean;

	constructor ($scope, $element) { (async () => {
		while (!self['Cyph'] || !self['ui']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
		this.ui		= self['ui'];

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
				}
			}
		});
	})(); }
}
