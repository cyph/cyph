/* tslint:disable:no-import-side-effect */

import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	Output
} from '@angular/core';
import * as braintreeDropIn from 'braintree-web-drop-in';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
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
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-checkout',
	styleUrls: ['./checkout.component.scss'],
	templateUrl: './checkout.component.html'
})
export class CheckoutComponent extends BaseProvider implements AfterViewInit {
	/* Braintree instance. */
	private braintreeInstance: any;

	/** Amount in dollars. */
	@Input() public amount: number			= 0;

	/** Trial API key to upgrade. */
	@Input() public apiKey: string			= '';

	/** Item category ID number. */
	@Input() public category?: number;

	/** Company. */
	@Input() public company: string			= '';

	/** Indicates whether checkout is complete. */
	public readonly complete				= new BehaviorSubject<boolean>(false);

	/** Checkout confirmation event. */
	@Output() public readonly confirmed		= new EventEmitter<void>();

	/** ID of Braintree container element. */
	public readonly containerID: string		= `id-${uuid()}`;

	/** Email address. */
	@Input() public email?: string;

	/** @see emailPattern */
	public readonly emailPattern			= emailPattern;

	/** Formats item name. */
	public readonly formatItemName			= memoize((itemName?: string) =>
		typeof itemName === 'string' ?
			itemName.replace(/([A-Z])/g, ' $1').toUpperCase() :
			undefined
	);

	/** Item ID number. */
	@Input() public item?: number;

	/** Item name. */
	@Input() public itemName?: string;

	/** Name. */
	@Input() public name?: string;

	/** If true, will never stop spinning. */
	@Input() public noSpinnerEnd: boolean	= false;

	/** Indicates whether payment is pending. */
	public readonly pending					= new BehaviorSubject<boolean>(false);

	/** Indicates whether pricing is per-user. */
	@Input() public perUser: boolean		= false;

	/** @see SubscriptionTypes */
	@Input() public subscriptionType?: SubscriptionTypes;

	/** @see SubscriptionTypes */
	public readonly subscriptionTypes		= SubscriptionTypes;

	/** Indicates whether checkout is complete. */
	public readonly success					= new BehaviorSubject<boolean>(false);

	/** Number of users for per-user pricing. */
	public readonly users					= new BehaviorSubject<number>(1);

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		await sleep(0);

		this.complete.next(false);

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

	/** @see Number.parseInt */
	public parseInt (s: string) : number {
		const n	= s ? Number.parseInt(s, 10) : 1;
		return !isNaN(n) ? n : 1;
	}

	/** Submits payment. */
	public async submit () : Promise<void> {
		if (!this.braintreeInstance) {
			this.complete.next(true);
			this.pending.next(false);
			this.success.next(false);

			throw new Error('Cannot process payment because Braintree failed to initialize.');
		}

		try {
			this.pending.next(true);

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
						amount: Math.floor(
							this.amount *
							100 *
							(this.perUser ? 1 : this.users.value)
						),
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
				this.complete.next(true);
				this.success.next(success);
			}
		}
		finally {
			this.pending.next(this.noSpinnerEnd);
		}
	}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
