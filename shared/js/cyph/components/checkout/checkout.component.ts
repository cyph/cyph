/* eslint-disable max-lines */

import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	OnInit,
	Output
} from '@angular/core';
import * as bitPay from 'bitpay.js';
import * as braintreeDataCollector from 'braintree-web-drop-in/node_modules/braintree-web/data-collector';
import * as braintreeDropIn from 'braintree-web-drop-in';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {SubscriptionTypes} from '../../checkout';
import {AffiliateService} from '../../services/affiliate.service';
import {AnalyticsService} from '../../services/analytics.service';
import {ConfigService} from '../../services/config.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {trackByValue} from '../../track-by/track-by-value';
import {debugLogError} from '../../util/log';
import {request, requestJSON} from '../../util/request';
import {uuid} from '../../util/uuid';
import {sleep} from '../../util/wait';
import {openWindow, reloadWindow} from '../../util/window';
import {bitPayLogo} from './bit-pay-logo';

/** TODO: Replace with npm package */
const EF: any | undefined =
	typeof (<any> self).EF?.conversion === 'function' ?
		(<any> self).EF :
		undefined;

(<any> self).braintree = {dataCollector: braintreeDataCollector};

/**
 * Angular component for Braintree payment checkout UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-checkout',
	styleUrls: ['./checkout.component.scss'],
	templateUrl: './checkout.component.html'
})
export class CheckoutComponent extends BaseProvider
	implements AfterViewInit, OnChanges, OnInit {
	/** @ignore */
	private readonly authorization = request({
		retries: 5,
		url: this.envService.baseUrl + 'braintree'
	});

	/** BitPay invoice ID. */
	private bitPayInvoiceID?: Promise<string>;

	/* Braintree instance. */
	private braintreeInstance: any;

	/** Partner program transaction ID. */
	private partnerTransactionID?: Promise<string | undefined>;

	/** Address. */
	@Input() public address: {
		countryCode?: string;
		postalCode?: string;
		streetAddress?: string;
	} = {};

	/** Indicates whether affiliate offer is accepted. */
	public affiliate: boolean = false;

	/** Amount in dollars. */
	@Input() public amount: number = 0;

	/** Item category ID number. */
	@Input() public category?: number;

	/** Company. */
	@Input() public company?: string;

	/** Indicates whether checkout is complete. */
	public readonly complete = new BehaviorSubject<boolean>(false);

	/** Indicates whether confirmation message should be shown. */
	public readonly confirmationMessage = new BehaviorSubject<
		{welcomeLetter?: string} | undefined
	>(undefined);

	/** Checkout confirmation event; emits API key if applicable. */
	@Output() public readonly confirmed = new EventEmitter<{
		apiKey?: string;
		namespace?: string;
	}>();

	/** ID of Braintree container element. */
	public readonly containerID: string = `id-${uuid()}`;

	/** Email address. */
	@Input() public email?: string;

	/** Error message. */
	public readonly errorMessage = new BehaviorSubject<string | undefined>(
		undefined
	);

	/** Discount for each user after the first one. */
	@Input() public extraUserDiscount: number = 0;

	/** Formats item name. */
	public readonly formatItemName = memoize((itemName?: string) =>
		typeof itemName === 'string' ?
			itemName.replace(/\s+([A-Z])/g, ' $1').toUpperCase() :
			undefined
	);

	/** Indicates whether, if per-user, a separate checkout should be performed per user. */
	@Input() public individualSubscriptions: boolean = false;

	/** Preexisting invite code to apply purchase to, if applicable. */
	@Input() public inviteCode?: string;

	/** Item ID number. */
	@Input() public item?: number;

	/** Item name. */
	@Input() public itemName?: string;

	/** Maximum number of users. */
	@Input() public maxUsers: number = 1000;

	/** Minimum nubmer of users. */
	@Input() public minUsers: number = 1;

	/** Name. */
	@Input() public name: {
		firstName?: string;
		lastName?: string;
	} = {};

	/** Namespace to use for generating API key. */
	@Input() public namespace?: string;

	/** If true, will never stop spinning. */
	@Input() public noSpinnerEnd: boolean = false;

	/** If applicable, partner offer ID. */
	@Input() public offerID?: number;

	/** Selected payment option. */
	public readonly paymentOption = new BehaviorSubject<string | undefined>(
		undefined
	);

	/** Indicates whether payment is pending. */
	public readonly pending = new BehaviorSubject<boolean>(false);

	/** Indicates whether pricing is per-user. */
	@Input() public perUser: boolean = false;

	/** @see reloadWindow */
	public readonly reloadWindow = reloadWindow;

	/** @see SubscriptionTypes */
	@Input() public subscriptionType?: SubscriptionTypes;

	/** @see SubscriptionTypes */
	public readonly subscriptionTypes = SubscriptionTypes;

	/** Indicates whether checkout is complete. */
	public readonly success = new BehaviorSubject<boolean>(false);

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @see trackByValue */
	public readonly trackByValue = trackByValue;

	/** Token of preexisting user to apply purchase to, if applicable. */
	@Input() public userToken?: string;

	/** User count options. */
	public readonly userOptions = new BehaviorSubject<number[]>([]);

	/** Number of users for per-user pricing. */
	public readonly users = new BehaviorSubject<number>(1);

	/** Creates BitPay invoice. */
	private async createBitPayInvoice (
		amount: number = this.amount
	) : Promise<string> {
		const o = await requestJSON({
			contentType: 'application/json',
			data: {
				buyer: {
					email: 'bitpay-checkout@cyph.com',
					notify: true
				},
				currency: 'USD',
				price: amount,
				token: this.configService.bitPayToken
			},
			headers: {'x-accept-version': '2.0.0'},
			method: 'POST',
			url: 'https://bitpay.com/invoices'
		}).catch(() => undefined);

		const id = o?.data?.id;

		if (typeof id !== 'string' || id.length < 1) {
			throw new Error('Creating BitPay invoice failed.');
		}

		return id;
	}

	/** Gets BitPay invoice. */
	private async getBitPayInvoice (id: string) : Promise<any> {
		return (
			(await requestJSON({
				url: `https://bitpay.com/invoices/${id}?token=${this.configService.bitPayToken}`
			}))?.data || {}
		);
	}

	/** @ignore */
	private updateUserOptions () : void {
		this.userOptions.next(
			new Array(this.maxUsers - this.minUsers + 1)
				.fill(0)
				.map((_, i) => i + this.minUsers)
		);

		this.users.next(
			Math.min(this.maxUsers, Math.max(this.minUsers, this.users.value))
		);
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		await sleep(0);

		this.complete.next(false);

		const amountString = this.amount.toFixed(2);

		if (this.subscriptionType === undefined) {
			this.bitPayInvoiceID = this.createBitPayInvoice();
		}

		const instance = await Promise.resolve<any>(
			braintreeDropIn.create({
				applePay: {
					displayName: 'Cyph',
					paymentRequest: {
						amount: amountString,
						label: 'Cyph'
					}
				},
				authorization: await this.authorization,
				dataCollector: {
					kount: true
				},
				googlePay: {
					googlePayVersion: 2,
					merchantId: '09900375611168245515',
					transactionInfo: {
						currencyCode: 'USD',
						totalPrice: amountString,
						totalPriceStatus: 'FINAL'
					}
				},
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
				/*
				venmo: {
					allowNewBrowserTab: false
				}
				*/
			})
		);

		this.braintreeInstance = instance;

		this.braintreeInstance.on('paymentOptionSelected', (o: any) => {
			const paymentOption = o?.paymentOption;
			if (typeof paymentOption === 'string') {
				this.paymentOption.next(paymentOption);
			}
		});

		if (!(this.elementRef.nativeElement instanceof HTMLElement)) {
			return;
		}

		/* eslint-disable-next-line no-unused-expressions */
		this.elementRef.nativeElement
			.querySelector('.braintree-toggle')
			?.addEventListener('click', () => {
				this.paymentOption.next(undefined);
			});

		if (!this.bitPayInvoiceID) {
			return;
		}

		const lastOption = this.elementRef.nativeElement.querySelector(
			'.braintree-option:last-of-type'
		);

		if (!(lastOption instanceof HTMLElement)) {
			return;
		}

		const bitPayOption = lastOption.cloneNode(true);
		const optionsParent = lastOption.parentElement;

		if (
			!(bitPayOption instanceof HTMLElement) ||
			!(optionsParent instanceof HTMLElement)
		) {
			return;
		}

		const otherOptionClass = Array.from(bitPayOption.classList).find(s =>
			s.startsWith('braintree-option_')
		);
		if (otherOptionClass) {
			bitPayOption.classList.remove(otherOptionClass);
		}

		const originalLogo = lastOption.querySelector(
			'.braintree-option__logo'
		);
		const logo = bitPayOption.querySelector('.braintree-option__logo');
		if (
			logo instanceof HTMLElement &&
			originalLogo instanceof HTMLElement
		) {
			const logoHeight = originalLogo.clientHeight;
			const logoWidth = originalLogo.clientWidth;

			while (logo.firstElementChild) {
				logo.removeChild(logo.firstElementChild);
			}

			logo.style.height = `${logoHeight}px`;
			logo.style.maxHeight = `${logoHeight}px`;
			logo.style.minHeight = `${logoHeight}px`;

			logo.style.width = `${logoWidth}px`;
			logo.style.maxWidth = `${logoWidth}px`;
			logo.style.minWidth = `${logoWidth}px`;

			const img = document.createElement('img');
			img.src = bitPayLogo;
			img.height = logoHeight;
			img.width = logoHeight;
			img.style.margin = 'auto';
			img.style.transform = 'scale(1.5)';
			logo.appendChild(img);
		}

		const label = bitPayOption.querySelector('.braintree-option__label');
		if (label instanceof HTMLElement) {
			label.textContent = 'BitPay';
			label.setAttribute(
				'aria-label',
				this.stringsService.bitPayAriaLabel
			);
		}

		bitPayOption.addEventListener('click', async () => {
			if (!this.bitPayInvoiceID) {
				this.bitPayInvoiceID = this.createBitPayInvoice();
			}

			bitPay.showInvoice(await this.bitPayInvoiceID);
		});

		bitPay.onModalWillLeave(async () => {
			const invoice = this.bitPayInvoiceID ?
				await this.getBitPayInvoice(await this.bitPayInvoiceID) :
				undefined;

			if (
				!(
					invoice?.status === 'complete' ||
					invoice?.status === 'confirmed' ||
					invoice?.status === 'paid'
				)
			) {
				this.bitPayInvoiceID = this.createBitPayInvoice();
				return;
			}

			this.submit(true);
		});

		optionsParent.appendChild(bitPayOption);

		self.addEventListener(
			'message',
			e => {
				if (
					e?.data?.status === 'complete' ||
					e?.data?.status === 'confirmed' ||
					e?.data?.status === 'paid'
				) {
					bitPay.hideFrame();
				}
			},
			false
		);

		/* eslint-disable-next-line no-unused-expressions */
		this.bitPayInvoiceID?.catch(bitPayError => {
			optionsParent.removeChild(bitPayOption);
			throw bitPayError;
		});
	}

	/** @inheritDoc */
	/* eslint-disable-next-line complexity */
	public ngOnInit () : void {
		/* Workaround for Angular Elements leaving inputs as strings */

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof this.amount === 'string' && this.amount) {
			this.amount = parseFloat(this.amount);
		}
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof this.category === 'string' && this.category) {
			this.category = parseFloat(this.category);
		}
		if (
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			typeof this.extraUserDiscount === 'string' &&
			this.extraUserDiscount
		) {
			this.extraUserDiscount = parseFloat(this.extraUserDiscount);
		}
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof this.individualSubscriptions === 'string') {
			this.individualSubscriptions =
				<any> this.individualSubscriptions === 'true';
		}
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof this.item === 'string' && this.item) {
			this.item = parseFloat(this.item);
		}
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof this.maxUsers === 'string' && this.maxUsers) {
			this.maxUsers = parseFloat(this.maxUsers);
		}
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof this.minUsers === 'string' && this.minUsers) {
			this.minUsers = parseFloat(this.minUsers);
		}
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof this.noSpinnerEnd === 'string') {
			this.noSpinnerEnd = <any> this.noSpinnerEnd === 'true';
		}
		if (
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			typeof this.offerID === 'string' &&
			this.offerID
		) {
			this.offerID = parseFloat(this.offerID);
		}
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof this.perUser === 'string') {
			this.perUser = <any> this.perUser === 'true';
		}
		if (
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			typeof this.subscriptionType === 'string' &&
			this.subscriptionType
		) {
			this.subscriptionType = parseFloat(this.subscriptionType);
			if (isNaN(this.subscriptionType)) {
				this.subscriptionType = undefined;
			}
		}

		this.updateUserOptions();

		const affid =
			EF && this.offerID !== undefined ?
				EF.urlParameter('affid') :
				undefined;

		if (affid) {
			this.partnerTransactionID = Promise.resolve<string>(
				EF.click({
					/* eslint-disable-next-line @typescript-eslint/naming-convention */
					affiliate_id: affid,
					/* eslint-disable-next-line @typescript-eslint/naming-convention */
					offer_id: this.offerID,
					sub1: EF.urlParameter('sub1'),
					sub2: EF.urlParameter('sub2'),
					sub3: EF.urlParameter('sub3'),
					sub4: EF.urlParameter('sub4'),
					sub5: EF.urlParameter('sub5'),
					uid: EF.urlParameter('uid')
				})
			).catch(() => undefined);
		}

		(async () => {
			if (!this.address.countryCode) {
				this.address.countryCode = this.configService.defaultCountryCode;
			}

			while (!this.destroyed.value) {
				this.changeDetectorRef.detectChanges();
				await sleep();
			}
		})();
	}

	/** @inheritDoc */
	public ngOnChanges () : void {
		this.updateUserOptions();
	}

	/** Submits payment. */
	/* eslint-disable-next-line complexity */
	public async submit (useBitPay: boolean = false) : Promise<void> {
		try {
			this.errorMessage.next(undefined);
			this.pending.next(true);

			const paymentMethod = useBitPay ?
				undefined :
				await new Promise<any>((resolve, reject) => {
					this.braintreeInstance.requestPaymentMethod(
						(err: any, data: any) => {
							if (data && !err) {
								resolve(data);
							}  else {
								reject(err);
							}
						}
					);
				}).catch(err => {
					throw err ||
						new Error(this.stringsService.checkoutBraintreeError);
				});

			const bitPayInvoiceID = !useBitPay ?
				'' :
				await this.bitPayInvoiceID;

			const creditCard = paymentMethod?.type === 'CreditCard';

			const partnerTransactionID = await this.partnerTransactionID;

			let welcomeLetter: string | undefined = await request({
				data: {
					amount: Math.floor(
						this.amount *
							100 *
							(!this.individualSubscriptions && this.perUser ?
								this.users.value :
								1) -
							this.extraUserDiscount *
								100 *
								(!this.individualSubscriptions && this.perUser ?
									this.users.value - 1 :
									0)
					),
					bitPayInvoiceID,
					creditCard,
					deviceData: paymentMethod?.deviceData,
					nonce: paymentMethod?.nonce,
					subscription: this.subscriptionType !== undefined,
					subscriptionCount:
						this.subscriptionType === undefined ?
							0 :
						this.individualSubscriptions && this.perUser ?
							this.users.value :
							1,
					url: location.toString(),
					...this.name,
					...(creditCard ? this.address : {}),
					...(this.category !== undefined ?
						{category: this.category} :
						{}),
					...(this.company !== undefined ?
						{company: this.company} :
						{}),
					...(this.email !== undefined ? {email: this.email} : {}),
					...(this.inviteCode !== undefined ?
						{inviteCode: this.inviteCode} :
						{}),
					...(this.item !== undefined ? {item: this.item} : {}),
					...(this.namespace !== undefined ?
						{namespace: this.namespace} :
						{}),
					...(partnerTransactionID ? {partnerTransactionID} : {}),
					...(this.userToken !== undefined ?
						{userToken: this.userToken} :
						{})
				},
				method: 'POST',
				url: this.envService.baseUrl + 'braintree'
			});

			this.analyticsService
				.sendTransaction(
					this.amount,
					this.users.value,
					this.category !== undefined && this.item !== undefined ?
						`${this.category.toString()}-${this.item.toString()}` :
						undefined
				)
				.catch(checkoutAnalError => {
					debugLogError(() => ({
						checkoutAnalError
					}));
				});

			const apiKey = welcomeLetter.startsWith('$APIKEY: ') ?
				welcomeLetter.split('$APIKEY: ')[1] :
				undefined;

			welcomeLetter =
				typeof apiKey === 'string' ?
					undefined :
					welcomeLetter.replace(/^Hello.*?,/, '').trim();

			if (this.affiliate) {
				await openWindow(this.affiliateService.checkout.href);
			}

			this.confirmed.emit({
				apiKey: apiKey || undefined,
				namespace: this.namespace
			});
			this.confirmationMessage.next(apiKey ? undefined : {welcomeLetter});

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
				`${this.stringsService.checkoutErrorStart}: "${(
					err.message || err.toString()
				)
					.replace(/\s+/g, ' ')
					.trim()
					.replace(/\.$/, '')}".`
			);
		}
	}

	constructor (
		/** @ignore */
		private readonly changeDetectorRef: ChangeDetectorRef,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @see AffiliateService */
		public readonly affiliateService: AffiliateService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
