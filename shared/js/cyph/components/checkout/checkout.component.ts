/* tslint:disable:no-import-side-effect */

import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnInit,
	Output
} from '@angular/core';
import * as braintreeDropIn from 'braintree-web-drop-in';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {SubscriptionTypes} from '../../checkout';
import {AffiliateService} from '../../services/affiliate.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {openWindow} from '../../util/open-window';
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
export class CheckoutComponent extends BaseProvider implements AfterViewInit, OnInit {
	/* Braintree instance. */
	private braintreeInstance: any;

	/** Amount in dollars. */
	@Input() public amount: number				= 0;

	/** Item category ID number. */
	@Input() public category?: number;

	/** Company. */
	@Input() public company?: string;

	/** Indicates whether affiliate offer is accepted. */
	public affiliate: boolean					= false;

	/** Indicates whether checkout is complete. */
	public readonly complete					= new BehaviorSubject<boolean>(false);

	/** Indicates whether confirmation message should be shown. */
	public readonly confirmationMessage			= new BehaviorSubject<boolean>(false);

	/** Checkout confirmation event; emits API key if applicable. */
	@Output() public readonly confirmed			= new EventEmitter<{
		apiKey?: string;
		namespace?: string;
	}>();

	/** ID of Braintree container element. */
	public readonly containerID: string			= `id-${uuid()}`;

	/** Email address. */
	@Input() public email?: string;

	/** Error message. */
	public readonly errorMessage				= new BehaviorSubject<string|undefined>(undefined);

	/** Formats item name. */
	public readonly formatItemName				= memoize((itemName?: string) =>
		typeof itemName === 'string' ?
			itemName.replace(/([A-Z])/g, ' $1').toUpperCase() :
			undefined
	);

	/** Discount for each user after the first one. */
	@Input() public extraUserDiscount: number	= 0;

	/** Item ID number. */
	@Input() public item?: number;

	/** Item name. */
	@Input() public itemName?: string;

	/** Name. */
	@Input() public name?: string;

	/** Namespace to use for generating API key. */
	@Input() public namespace?: string;

	/** If true, will never stop spinning. */
	@Input() public noSpinnerEnd: boolean		= false;

	/** Indicates whether payment is pending. */
	public readonly pending						= new BehaviorSubject<boolean>(false);

	/** Indicates whether pricing is per-user. */
	@Input() public perUser: boolean			= false;

	/** @see SubscriptionTypes */
	@Input() public subscriptionType?: SubscriptionTypes;

	/** @see SubscriptionTypes */
	public readonly subscriptionTypes			= SubscriptionTypes;

	/** Indicates whether checkout is complete. */
	public readonly success						= new BehaviorSubject<boolean>(false);

	/** @see trackBySelf */
	public readonly trackBySelf					= trackBySelf;

	/** User count options. */
	public readonly userOptions: number[]		= new Array(99).fill(0).map((_, i) => i + 2);

	/** Number of users for per-user pricing. */
	public readonly users						= new BehaviorSubject<number>(1);

	/** @inheritDoc */
	public ngOnInit () : void {
		/* Workaround for Angular Elements leaving inputs as strings */

		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof this.amount === 'string' && this.amount) {
			this.amount				= parseFloat(this.amount);
		}
		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof this.category === 'string' && this.category) {
			this.category			= parseFloat(this.category);
		}
		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof this.extraUserDiscount === 'string' && this.extraUserDiscount) {
			this.extraUserDiscount	= parseFloat(this.extraUserDiscount);
		}
		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof this.item === 'string' && this.item) {
			this.item				= parseFloat(this.item);
		}
		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof this.noSpinnerEnd === 'string') {
			this.noSpinnerEnd		= (<any> this.noSpinnerEnd) === 'true';
		}
		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof this.perUser === 'string') {
			this.perUser			= (<any> this.perUser) === 'true';
		}
		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof this.subscriptionType === 'string' && this.subscriptionType) {
			this.subscriptionType	= parseFloat(this.subscriptionType);
		}

		(async () => {
			while (!this.destroyed.value) {
				this.changeDetectorRef.detectChanges();
				await sleep();
			}
		})();
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		await sleep(0);

		this.complete.next(false);

		const authorization	= await request({
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
				paypalCredit: {
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
		try {
			this.errorMessage.next(undefined);
			this.pending.next(true);

			const paymentMethod	= await new Promise<any>((resolve, reject) => {
				this.braintreeInstance.requestPaymentMethod((err: any, data: any) => {
					if (data && !err) {
						resolve(data);
					}
					else {
						reject(err);
					}
				});
			}).catch(err => {
				throw (err || new Error(this.stringsService.checkoutBraintreeError));
			});

			const apiKey	= await request({
				data: {
					amount: Math.floor(
						(
							this.amount *
							100 *
							(this.perUser ? this.users.value : 1)
						) - (
							this.extraUserDiscount *
							100 *
							(this.perUser ? (this.users.value - 1) : 0)
						)
					),
					creditCard: paymentMethod.type === 'CreditCard',
					nonce: paymentMethod.nonce,
					subscription: this.subscriptionType !== undefined,
					url: location.toString(),
					...(this.category !== undefined ? {category: this.category} : {}),
					...(this.company !== undefined ? {company: this.company} : {}),
					...(this.email !== undefined ? {email: this.email} : {}),
					...(this.item !== undefined ? {item: this.item} : {}),
					...(this.name !== undefined ? {name: this.name} : {}),
					...(this.namespace !== undefined ? {namespace: this.namespace} : {})
				},
				method: 'POST',
				url: this.envService.baseUrl + 'braintree'
			});

			if (this.affiliate) {
				openWindow(this.affiliateService.checkout.href);
			}

			this.confirmed.emit({apiKey: apiKey || undefined, namespace: this.namespace});
			this.confirmationMessage.next(!apiKey);

			if (!this.noSpinnerEnd) {
				this.complete.next(true);
				this.pending.next(false);
				this.success.next(true);
			}
		}
		catch (err) {
			this.complete.next(true);
			this.pending.next(false);
			this.success.next(false);

			if (!err) {
				return;
			}

			this.errorMessage.next(
				`${this.stringsService.checkoutErrorStart}: "${
					(err.message || err.toString()).replace(/\s+/g, ' ').trim().replace(/\.$/, '')
				}".`
			);
		}
	}

	constructor (
		/** @ignore */
		private readonly changeDetectorRef: ChangeDetectorRef,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see AffiliateService */
		public readonly affiliateService: AffiliateService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
