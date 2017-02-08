import {Component, ElementRef, Input, OnInit} from '@angular/core';
import * as braintree from 'braintree-web';
import * as $ from 'jquery';
import {ConfigService} from '../services/config.service';
import {EnvService} from '../services/env.service';
import {util} from '../util';


/**
 * Angular component for Braintree payment checkout UI.
 */
@Component({
	selector: 'cyph-checkout',
	styleUrls: ['../../css/components/checkout.css'],
	templateUrl: '../../../templates/checkout.html'
})
export class CheckoutComponent implements OnInit {
	/** Amount in dollars. */
	@Input() public amount: number;

	/** Item category ID number. */
	@Input() public category: number;

	/** Email address. */
	@Input() public email: string;

	/** Item ID number. */
	@Input() public item: number;

	/** Name. */
	@Input() public name: string;

	/** Indicates whether this will be a recurring purchase. */
	@Input() public subscription: boolean;

	/** Indicates whether checkout is complete. */
	public complete: boolean;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		const token: string	= await util.request({
			retries: 5,
			url: this.envService.baseUrl + this.configService.braintreeConfig.endpoint
		});

		const checkoutUI: JQuery	= $(this.elementRef.nativeElement).find('.braintree');

		checkoutUI.empty();

		/* Temporarily <any> pending an upgrade to the Braintree v3 SDK */
		(<any> braintree).setup(token, 'dropin', {
			container: checkoutUI[0],
			enableCORS: true,
			onPaymentMethodReceived: async (data: any) => {
				this.complete	= 'true' === await util.request({
					data: {
						Amount: Math.floor(this.amount * 100),
						Category: this.category,
						Email: this.email,
						Item: this.item,
						Name: this.name,
						Nonce: data.nonce,
						Subscription: this.subscription
					},
					method: 'POST',
					url: this.envService.baseUrl + this.configService.braintreeConfig.endpoint
				});
			}
		});
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
