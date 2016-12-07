import {Component, ElementRef, Input} from '@angular/core';
import {Config} from '../../config';
import {Env} from '../../env';
import {Util} from '../../util';


/**
 * Angular component for Braintree payment checkout UI.
 */
@Component({
	selector: 'cyph-checkout',
	templateUrl: '../../../../templates/checkout.html'
})
export class Checkout {
	/** @ignore */
	@Input() public amount: string;

	/** @ignore */
	@Input() public category: string;

	/** @ignore */
	@Input() public email: string;

	/** @ignore */
	@Input() public item: string;

	/** @ignore */
	@Input() public name: string;

	/** @ignore */
	public complete: boolean;

	constructor (elementRef: ElementRef) { (async () => {
		const token: string	= await Util.request({
			retries: 5,
			url: Env.baseUrl + Config.braintreeConfig.endpoint
		});

		const checkoutUI: JQuery	= $(elementRef.nativeElement).find('.braintree');

		checkoutUI.html('');

		(<any> self).braintree.setup(token, 'dropin', {
			container: checkoutUI[0],
			enableCORS: true,
			onPaymentMethodReceived: async (data: any) => {
				const response: string	= await Util.request({
					data: {
						Amount: Math.floor(parseFloat(this.amount) * 100),
						Category: this.category,
						Email: this.email,
						Item: this.item,
						Name: this.name,
						Nonce: data.nonce
					},
					method: 'POST',
					url: Env.baseUrl + Config.braintreeConfig.endpoint
				});

				if (JSON.parse(response).Status === 'authorized') {
					this.complete	= true;
				}
			}
		});
	})(); }
}
