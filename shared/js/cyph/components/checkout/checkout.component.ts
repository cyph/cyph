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
import {loadStripe} from '@stripe/stripe-js/pure';
import * as bitPay from 'bitpay.js';
import * as braintreeDropIn from 'braintree-web-drop-in';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {SubscriptionTypes} from '../../checkout';
import {MaybePromise} from '../../maybe-promise-type';
import {AffiliateService} from '../../services/affiliate.service';
import {AnalyticsService} from '../../services/analytics.service';
import {ConfigService} from '../../services/config.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {trackByValue} from '../../track-by/track-by-value';
import {roundToString} from '../../util/formatting';
import {debugLogError} from '../../util/log';
import {request, requestJSON} from '../../util/request';
import {uuid} from '../../util/uuid';
import {sleep} from '../../util/wait';
import {openWindow, reloadWindow} from '../../util/window';
import {bitPayLogo} from './bit-pay-logo';

/* TODO: Replace with npm package */
const EF: any | undefined =
	typeof (<any> self).EF?.conversion === 'function' ?
		(<any> self).EF :
		undefined;

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
	/** BitPay invoice ID. */
	private bitPayInvoiceID?: Promise<string>;

	/* Braintree instance. */
	private braintreeInstance: any;

	/** Braintree auth token. */
	private readonly braintreeToken = memoize(async () =>
		request({
			retries: 5,
			url: this.envService.baseUrl + 'braintreetoken'
		})
	);

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

	/** Checkout payment processor. */
	@Input() public checkoutProvider: 'braintree' | 'stripe' = 'braintree';

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

	/** In-app purchase metadata, if applicable. (iOS-only) */
	@Input() public inAppPurchase?: {
		alias: string;
		id: string;
		type: string;
	};

	/** Indicates whether, if per-user, a separate checkout should be performed per user. */
	@Input() public individualSubscriptions: boolean = false;

	/** Preexisting invite code to apply purchase to, if applicable. */
	@Input() public inviteCode?: MaybePromise<string | undefined>;

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

	/** Amount saved via partner discount, if applicable. */
	public readonly partnerDiscountString = new BehaviorSubject<
		string | undefined
	>(undefined);

	/** Selected payment option. */
	public readonly paymentOption = new BehaviorSubject<string | undefined>(
		undefined
	);

	/** Indicates whether payment is pending. */
	public readonly pending = new BehaviorSubject<boolean>(false);

	/** Indicates whether pricing is per-user. */
	@Input() public perUser: boolean = false;

	/** Indicates whether reCAPTCHA is required. */
	public readonly recaptchaRequired = !this.envService.isHomeSite ?
		of(false) :
		this.paymentOption.pipe(map(paymentOption => paymentOption === 'card'));

	/** reCAPTCHA response. */
	public readonly recaptchaResponse = new BehaviorSubject<string | undefined>(
		undefined
	);

	/** @see reloadWindow */
	public readonly reloadWindow = reloadWindow;

	/** @see roundToString */
	public readonly roundToString = roundToString;

	/** Spinner to set while performing checkout. */
	@Input() public spinner?: BehaviorSubject<boolean>;

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
	@Input() public userToken?: MaybePromise<string | undefined>;

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
		if (this.inAppPurchase) {
			return;
		}

		if (!this.elementRef.nativeElement || !this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		/* Can also handle this directly from the cyph.com JS */
		if (this.checkoutProvider === 'stripe') {
			const [stripe, stripeToken] = await Promise.all([
				loadStripe(
					this.envService.environment.production ?
						this.configService.stripe.apiKeys.prod :
						this.configService.stripe.apiKeys.test
				),
				Promise.all([this.partnerTransactionID, this.userToken]).then(
					async ([partnerTransactionID, userToken]) =>
						request({
							data: {
								amount: Math.floor(this.amount * 100),
								subscription:
									this.subscriptionType !== undefined,
								url: location.toString(),
								...(this.category !== undefined ?
									{category: this.category} :
									{}),
								...(this.item !== undefined ?
									{item: this.item} :
									{}),
								...(this.namespace !== undefined ?
									{namespace: this.namespace} :
									{}),
								...(partnerTransactionID ?
									{partnerTransactionID} :
									{}),
								...(userToken !== undefined ? {userToken} : {})
							},
							method: 'POST',
							retries: 5,
							url: this.envService.baseUrl + 'stripesession'
						})
				)
			]);

			if (stripe && stripeToken) {
				await stripe.redirectToCheckout({sessionId: stripeToken});
			}

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
						total: {
							amount: amountString,
							label: 'Cyph'
						}
					}
				},
				authorization: await this.braintreeToken(),
				card: {
					overrides: {
						fields: {
							/* eslint-disable-next-line no-null/no-null */
							postalCode: null
						}
					}
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

		this.bitPayInvoiceID?.catch(bitPayError => {
			optionsParent.removeChild(bitPayOption);
			throw bitPayError;
		});
	}

	/** @inheritDoc */
	/* eslint-disable-next-line complexity */
	public ngOnInit () : void {
		super.ngOnInit();

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

		const affid: string | undefined =
			EF && this.offerID !== undefined ?
				EF.urlParameter('affid') ||
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				localStorage.getItem('affid') ||
				undefined :
				undefined;

		if (affid) {
			const partnerDiscount =
				Math.floor(
					this.amount * this.configService.partnerDiscountRate
				) / 100;

			this.amount -= partnerDiscount;
			this.partnerDiscountString.next(
				this.stringsService.setParameters(
					this.stringsService.partnerDiscount,
					{discount: partnerDiscount.toFixed(2)}
				)
			);

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
		let errorMessage: string | undefined;

		try {
			this.errorMessage.next(undefined);
			this.pending.next(true);

			const inAppPurchase = this.inAppPurchase;

			if (
				inAppPurchase &&
				!(await this.dialogService.confirm({
					content: this.stringsService.setParameters(
						this.stringsService.checkoutInAppPaymentConfirm,
						{
							amount: this.amount.toString(),
							item:
								this.itemName ||
								this.stringsService
									.checkoutInAppPaymentTitleDefaultItemName,
							payment:
								this.subscriptionType === undefined ?
									this.stringsService
										.checkoutSubscriptionNone :
									this.stringsService.setParameters(
										this.stringsService
											.checkoutSubscriptionRecurring,
										{
											subscription:
												this.subscriptionType ===
												SubscriptionTypes.annual ?
													this.stringsService
														.checkoutSubscriptionAnnual :
													this.stringsService
														.checkoutSubscriptionMonthly
										}
									)
						}
					),
					title: this.stringsService.setParameters(
						this.stringsService.checkoutInAppPaymentTitle,
						{
							item:
								this.itemName ||
								this.stringsService
									.checkoutInAppPaymentTitleDefaultItemName
						}
					)
				}))
			) {
				return;
			}

			this.spinner?.next(true);

			const paymentMethod =
				useBitPay || !!inAppPurchase ?
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
							new Error(
								this.stringsService.checkoutBraintreeError
							);
					});

			const bitPayInvoiceID = !useBitPay ?
				'' :
				await this.bitPayInvoiceID;

			const creditCard = paymentMethod?.type === 'CreditCard';

			const partnerTransactionID = await this.partnerTransactionID;

			const iOSInAppPaymentProduct = !inAppPurchase ?
				undefined :
				await (async () => {
					const store = (<any> self).store;

					if (typeof store?.register !== 'function') {
						throw new Error('cordova-plugin-purchase not present');
					}

					await new Promise<void>(resolve => {
						store.ready(resolve);
					});

					/* https://github.com/j3k0/cordova-plugin-purchase/blob/master/doc/api.md#storeproduct-object */
					const productPromise = new Promise<{
						finish: () => void;
						transaction: {
							appStoreReceipt: string;
							id: string;
							type: string;
						};
					}>((resolve, reject) => {
						store.when(inAppPurchase.id).approved(resolve);
						store.when(inAppPurchase.id).cancelled(reject);
						store.when(inAppPurchase.id).error(reject);
					});

					await store.order(inAppPurchase.id);

					const product = await productPromise;

					if (product.transaction.type !== 'ios-appstore') {
						throw new Error('Unsupported in-app purchase type.');
					}

					return product;
				})();

			const [inviteCode, userToken] = await Promise.all([
				this.inviteCode,
				this.userToken
			]);

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
					creditCard,
					subscription: this.subscriptionType !== undefined,
					subscriptionCount:
						this.subscriptionType === undefined ?
							0 :
						this.individualSubscriptions && this.perUser ?
							this.users.value :
							1,
					url: location.toString(),
					...this.name,
					...(bitPayInvoiceID ? {bitPayInvoiceID} : {}),
					...(creditCard ? this.address : {}),
					...(this.category !== undefined ?
						{category: this.category} :
						{}),
					...(this.company !== undefined ?
						{company: this.company} :
						{}),
					...(this.email !== undefined ? {email: this.email} : {}),
					...(inviteCode !== undefined ? {inviteCode} : {}),
					...(iOSInAppPaymentProduct ?
						{
							appStoreReceipt:
								iOSInAppPaymentProduct.transaction
									.appStoreReceipt
						} :
						{}),
					...(this.item !== undefined ? {item: this.item} : {}),
					...(this.namespace !== undefined ?
						{namespace: this.namespace} :
						{}),
					...(paymentMethod?.nonce ?
						{nonce: paymentMethod.nonce} :
						{}),
					...(this.recaptchaResponse.value !== undefined ?
						{recaptchaResponse: this.recaptchaResponse.value} :
						{}),
					...(partnerTransactionID ? {partnerTransactionID} : {}),
					...(userToken !== undefined ? {userToken} : {})
				},
				method: 'POST',
				url: this.envService.baseUrl + 'checkout'
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

			iOSInAppPaymentProduct?.finish();

			const apiKey = welcomeLetter.startsWith('$APIKEY: ') ?
				welcomeLetter.split('$APIKEY: ')[1] :
				undefined;

			welcomeLetter =
				typeof apiKey === 'string' ?
					undefined :
					(iOSInAppPaymentProduct ?
						welcomeLetter :
						welcomeLetter.replace(/^Hello.*?,/, '')
					).trim();

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

			errorMessage = `${this.stringsService.checkoutErrorStart}: "${(
				err.message || err.toString()
			)
				.replace(/\s+/g, ' ')
				.trim()
				.replace(/\.$/, '')}".`;
		}
		finally {
			this.spinner?.next(false);

			if (!errorMessage) {
				/* eslint-disable-next-line no-unsafe-finally */
				return;
			}

			this.errorMessage.next(errorMessage);

			if (!this.inAppPurchase) {
				/* eslint-disable-next-line no-unsafe-finally */
				return;
			}

			await this.dialogService.toast(
				errorMessage,
				-1,
				this.stringsService.ok
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
		private readonly dialogService: DialogService,

		/** @see AffiliateService */
		public readonly affiliateService: AffiliateService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
