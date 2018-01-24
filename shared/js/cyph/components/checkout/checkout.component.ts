/* tslint:disable:no-import-side-effect */

import {AfterViewInit, Component, ElementRef, Input} from '@angular/core';
import * as braintreeDropIn from 'braintree-web-drop-in';
import {SubscriptionTypes} from '../../checkout';
import {ConfigService} from '../../services/config.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {request} from '../../util/request';
import {uuid} from '../../util/uuid';
import {sleep} from '../../util/wait';


/**
 * Angular component for Braintree payment checkout UI.
 */
@Component({
	selector: 'cyph-checkout',
	styleUrls: ['./checkout.component.scss'],
	templateUrl: './checkout.component.html'
})
export class CheckoutComponent implements AfterViewInit {
	/* Braintree instance. */
	private braintreeInstance: any;

	/** Amount in dollars. */
	@Input() public amount: number	= 0;

	/** Item category ID number. */
	@Input() public category?: number;

	/** Company. */
	@Input() public company?: string;

	/** Indicates whether checkout is complete. */
	public complete: boolean			= false;

	/** ID of Braintree container element. */
	public readonly containerID: string	= `id-${uuid()}`;

	/** Email address. */
	@Input() public email?: string;

	/** Item ID number. */
	@Input() public item?: number;

	/** Name. */
	@Input() public name?: string;

	/** Indicates whether payment is pending. */
	public pending: boolean				= false;

	/** @see SubscriptionTypes */
	@Input() public subscriptionType?: SubscriptionTypes;

	/** @see SubscriptionTypes */
	@Input() public subscriptionTypes: typeof SubscriptionTypes	= SubscriptionTypes;

	/** Indicates whether checkout is complete. */
	public success: boolean				= false;

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		await sleep(0);

		this.complete	= false;

		const authorization: string	= await request({
			retries: 5,
			url: this.envService.baseUrl + this.configService.braintreeConfig.endpoint
		});

		braintreeDropIn.create(
			{
				authorization,
				selector: `#${this.containerID}`
			},
			(err: any, instance: any) => {
				if (err) {
					throw err;
				}

				this.braintreeInstance	= instance;
			}
		);
	}

	/** Submits payment. */
	public async submit () : Promise<void> {
		if (!this.braintreeInstance) {
			this.complete	= true;
			this.pending	= false;
			this.success	= false;

			throw new Error('Cannot process payment because Braintree failed to initialize.');
		}

		try {
			this.pending		= true;

			const paymentMethod	= await new Promise<{
				data: any;
				err: any;
			}>(resolve => {
				this.braintreeInstance.requestPaymentMethod((err: any, data: any) => {
					resolve({data, err});
				});
			});

			if (paymentMethod.err) {
				throw paymentMethod.err;
			}

			this.success	=
				await request({
					data: {
						amount: Math.floor(this.amount * 100),
						category: this.category,
						company: this.company || '',
						email: this.email,
						item: this.item,
						name: this.name,
						nonce: paymentMethod.data.nonce,
						subscription: this.subscriptionType !== undefined
					},
					method: 'POST',
					url: this.envService.baseUrl + this.configService.braintreeConfig.endpoint
				}).catch(
					() => ''
				) === 'true'
			;

			this.complete	= true;
		}
		finally {
			this.pending	= false;
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
