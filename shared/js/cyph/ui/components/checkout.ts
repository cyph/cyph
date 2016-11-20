import {
	Directive,
	DoCheck,
	ElementRef,
	Inject,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';
import {Config} from '../../config';
import {Env} from '../../env';
import {Util} from '../../util';
import {Templates} from '../templates';


/**
 * Angular component for Braintree payment checkout UI.
 */
@Directive({
	selector: 'cyph-checkout'
})
export class Checkout
	extends UpgradeComponent
	implements DoCheck, OnChanges, OnInit, OnDestroy
{
	/** Component title. */
	public static title: string	= 'cyphCheckout';

	/** Component configuration. */
	public static config		= {
		bindings: {
			amount: '=',
			category: '=',
			email: '=',
			fullName: '=',
			item: '='
		},
		controller: class {
			/** @ignore */
			public Cyph: any;

			/** @ignore */
			public ui: any;

			/** @ignore */
			public complete: boolean;

			/** @ignore */
			public amount: string;

			/** @ignore */
			public category: string;

			/** @ignore */
			public email: string;

			/** @ignore */
			public item: string;

			/** @ignore */
			public fullName: string;

			constructor ($element: JQuery) { (async () => {
				while (!self['Cyph'] || !self['ui']) {
					await Util.sleep();
				}

				this.Cyph	= self['Cyph'];
				this.ui		= self['ui'];

				const token: string	= await Util.request({
					retries: 5,
					url: Env.baseUrl + Config.braintreeConfig.endpoint
				});

				const checkoutUI: JQuery	= $element.find('.braintree');

				checkoutUI.html('');

				self['braintree'].setup(token, 'dropin', {
					container: checkoutUI[0],
					enableCORS: true,
					onPaymentMethodReceived: async (data) => {
						const response: string	= await Util.request({
							data: {
								Amount: Math.floor(parseFloat(this.amount) * 100),
								Category: this.category,
								Email: this.email,
								Item: this.item,
								Name: this.fullName,
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
		},
		template: Templates.checkout,
		transclude: true
	};


	/** @ignore */
	@Input() public amount: string;

	/** @ignore */
	@Input() public category: string;

	/** @ignore */
	@Input() public email: string;

	/** @ignore */
	@Input() public item: string;

	/** @ignore */
	@Input() public fullName: string;

	/** @ignore */
	public ngDoCheck () : void {
		super.ngDoCheck();
	}

	/** @ignore */
	public ngOnChanges (changes: SimpleChanges) : void {
		super.ngOnChanges(changes);
	}

	/** @ignore */
	public ngOnDestroy () : void {
		super.ngOnDestroy();
	}

	/** @ignore */
	public ngOnInit () : void {
		super.ngOnInit();
	}

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(Checkout.title, elementRef, injector);
	}
}
