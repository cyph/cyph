/* tslint:disable:no-import-side-effect */

import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
import * as braintreeDropIn from 'braintree-web-drop-in';
import {AppService} from '../../../cyph.com/app.service';
import {SubscriptionTypes} from '../../checkout';
import {emailPattern} from '../../email-pattern';
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
	@Input() public amount: number		= 0;

	/** Trial API key to upgrade. */
	@Input() public apiKey: string		= '';

	/** Item category ID number. */
	@Input() public category?: number;

	/** Company. */
	@Input() public company: string		= '';

	/** Indicates whether checkout is complete. */
	public complete: boolean			= false;

	/** Checkout confirmation event. */
	@Output() public readonly confirmed: EventEmitter<void>	= new EventEmitter<void>();

	/** ID of Braintree container element. */
	public readonly containerID: string	= `id-${uuid()}`;

	/** Email address. */
	@Input() public email?: string;

	/** @see emailPattern */
	public readonly emailPattern: typeof emailPattern	= emailPattern;

	/** Item ID number. */
	@Input() public item?: number;

	/** Name. */
	@Input() public name?: string;

	/** Indicates whether payment is pending. */
	public pending: boolean				= false;

	public itemName: string | undefined	=
		this.appService.cart ?
			this.appService.cart.itemName.replace(/([A-Z])/g, ' $1').toUpperCase() :
			undefined
	;

	/** If true, will never stop spinning. */
	@Input() public noSpinnerEnd: boolean	= false;

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
			url: this.envService.baseUrl + 'braintree'
		});

		braintreeDropIn.create(
			{
				authorization,
				paypal: {
					buttonStyle: {
						color: 'blue',
						shape: 'pill',
						size: 'responsive'
					},
					flow: 'vault'
				},
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

			const success	=
				await request({
					data: {
						amount: Math.floor(this.amount * 100),
						apiKey: this.apiKey,
						category: this.category,
						company: this.company,
						email: this.email,
						item: this.item,
						name: this.name,
						nonce: paymentMethod.data.nonce,
						subscription: this.subscriptionType !== undefined
					},
					method: 'POST',
					url: this.envService.baseUrl + 'braintree'
				}).catch(
					() => ''
				) === 'true'
			;

			if (success) {
				this.confirmed.emit();
			}

			if (!this.noSpinnerEnd) {
				this.complete	= true;
				this.success	= success;
			}
		}
		finally {
			this.pending	= this.noSpinnerEnd;
		}
	}

	constructor (
		/** @ignore */
		private readonly appService: AppService,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
