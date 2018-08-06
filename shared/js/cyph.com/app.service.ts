import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {NavigationEnd, Router} from '@angular/router';
import * as $ from 'jquery';
import {BehaviorSubject} from 'rxjs';
import * as WOW from 'wowjs';
import {BaseProvider} from '../cyph/base-provider';
import {SubscriptionTypes} from '../cyph/checkout';
import {BetaRegisterComponent} from '../cyph/components/beta-register';
import {ConfigService} from '../cyph/services/config.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {SignupService} from '../cyph/services/signup.service';
import {request} from '../cyph/util/request';
import {fromQueryString} from '../cyph/util/serialization';
import {sleep, waitForIterable} from '../cyph/util/wait';
import {Carousel} from './carousel';
import {elements} from './elements';
import {HomeSections, pageTitles, Promos, States} from './enums';


/**
 * Angular service for Cyph home page.
 */
@Injectable()
export class AppService extends BaseProvider {
	/** @ignore */
	private disableNextScroll: boolean	= false;

	/** @ignore */
	private readonly queryParams: any	= fromQueryString();

	/** Amount, category, and item in cart. */
	public readonly cart				= new BehaviorSubject<undefined|{
		amount: number;
		apiKey?: string;
		categoryID: number;
		categoryName: string;
		itemID: number;
		itemName: string;
		subscriptionType?: SubscriptionTypes;
	}>(
		undefined
	);

	/** @see ClaimUsernameComponent.email */
	public readonly claimUsernameEmail	= new BehaviorSubject<string|undefined>(undefined);

	/** @see ContactComponent.to */
	public readonly contactTo			= new BehaviorSubject<string|undefined>(undefined);

	/** Donation amount in dollars. */
	public readonly donationAmount		= new BehaviorSubject<number>(10);

	/** Carousel of features. */
	public readonly featureCarousel		= new BehaviorSubject<Carousel|undefined>(undefined);

	/** Current feature displayed in hero section. */
	public readonly featureIndex		= new BehaviorSubject<number>(0);

	/** List of features to cycle through in hero section. */
	public readonly features: string[]	= [
		'Video Calls',
		'Voice Calls',
		'Chats',
		'Photos',
		'File Transfers'
	];

	/** @see HomeSections */
	public readonly homeSection			= new BehaviorSubject<HomeSections|undefined>(undefined);

	/** @see Promos */
	public readonly promo				= new BehaviorSubject<Promos|undefined>(undefined);

	/** @see States */
	public readonly state				= new BehaviorSubject<States>(States.home);

	/** Carousel of testimonials. */
	public readonly testimonialCarousel	= new BehaviorSubject<Carousel|undefined>(undefined);

	/** @ignore */
	private cycleFeatures () : void {
		if (this.featureIndex.value < this.features.length - 1) {
			this.featureIndex.next(this.featureIndex.value + 1);
		}
		else {
			this.featureIndex.next(0);
		}
	}

	/** @ignore */
	/* tslint:disable-next-line:cyclomatic-complexity */
	private async onUrlChange (url: string) : Promise<void> {
		/* Workaround to allow triggering this method
			even when URL hasn't changed (e.g. for scrolling). */
		this.router.navigated	= false;

		/* Workaround for Prefinery bug */
		if (typeof this.queryParams.r === 'string') {
			this.router.navigate(['invite', this.queryParams.r]);
			return;
		}
		else if (this.queryParams['ref-check'] !== undefined) {
			this.router.navigate(['waitlisttrack']);
			return;
		}

		const urlSegmentPaths: string[]	= url.split('/').slice(1);
		const urlBasePath: string		= urlSegmentPaths[0];

		const state: States|undefined	= (<any> States)[urlBasePath];
		const promo: Promos|undefined	= (<any> Promos)[urlBasePath];

		this.homeSection.next(promo === undefined ?
			(<any> HomeSections)[urlBasePath] :
			HomeSections.promo
		);

		this.titleService.setTitle(
			(<any> pageTitles)[urlBasePath] || pageTitles.defaultTitle
		);

		if (this.homeSection.value !== undefined) {
			this.state.next(States.home);

			if (promo !== undefined) {
				this.promo.next(promo);
				this.signupService.promo.next(Promos[promo]);
			}

			await sleep();

			switch (this.homeSection.value) {
				case HomeSections.register:
					await this.dialogService.baseDialog(BetaRegisterComponent);
					this.disableNextScroll	= true;
					this.router.navigate(['']);
					break;

				case HomeSections.invite:
					this.signupService.data.inviteCode.next(
						urlSegmentPaths.join('/').split(
							`${HomeSections[HomeSections.invite]}/`
						)[1] || ''
					);

					await this.dialogService.baseDialog(BetaRegisterComponent, o => {
						o.invite	= true;
					});

					this.disableNextScroll	= true;
					this.router.navigate(['']);

					break;

				default:
					const loadComplete	= () => $('body.load-complete');
					if (loadComplete().length < 1) {
						await waitForIterable(loadComplete);
						await sleep(500);
					}

					this.scroll(
						(
							$(`#${HomeSections[this.homeSection.value]}-section`).offset() ||
							{left: 0, top: 0}
						).top -
						(
							this.homeSection.value === HomeSections.gettingstarted ?
								-1 :
								(elements.mainToolbar().height() || 0)
						)
					);
			}

			return;
		}

		if (state === States.checkout) {
			try {
				const apiKey	= urlSegmentPaths[3] && urlSegmentPaths[3].length === 32 ?
					urlSegmentPaths[3] :
					undefined
				;

				this.updateCart(
					urlSegmentPaths[1],
					urlSegmentPaths[2].replace(
						/-(.)/g,
						(_, s) => s.toUpperCase()
					),
					!apiKey ? parseFloat(urlSegmentPaths[3]) : undefined,
					apiKey
				);
			}
			catch {
				this.router.navigate(['404']);
			}
		}
		else if (state === States.claimusername) {
			this.claimUsernameEmail.next(urlSegmentPaths[1]);
			this.state.next(state);
		}
		else if (state === States.contact) {
			const to: string	= urlSegmentPaths[1];
			if (this.configService.contactEmailAddresses.indexOf(to) > -1) {
				this.contactTo.next(to);
			}

			this.state.next(state);
		}
		else if (state !== undefined) {
			this.state.next(state);
		}
		else if (urlBasePath === '') {
			this.state.next(States.home);
		}
		else if (urlBasePath === '404') {
			this.state.next(States.error);
		}
		else {
			this.router.navigate(['404']);
		}

		if (this.disableNextScroll) {
			this.disableNextScroll	= false;
		}
		else {
			await sleep(500);
			this.scroll(0);
		}
	}

	/** @ignore */
	private async scroll (
		position: number,
		delayFactor: number = 0.75,
		onComplete?: Function
	) : Promise<void> {
		const delay: number	=
			delayFactor *
			Math.abs(($(document).scrollTop() || 0) - position)
		;

		$(document.documentElement).animate({scrollTop: position}, delay);

		if (onComplete) {
			await sleep(delay + 50);
			onComplete();
		}
	}

	/** Checkout completion event handler. */
	public checkoutConfirmed () : void {
		if (this.cart.value && this.cart.value.apiKey && typeof this.queryParams.ref === 'string') {
			location.href	= `${this.queryParams.ref}/confirm/${this.cart.value.apiKey}`;
		}
	}

	/** Update cart and open checkout screen. */
	public updateCart (
		categoryName: string,
		itemName: string,
		customAmount?: number,
		apiKey?: string
	) : void {
		const category	= this.configService.pricingConfig.categories[categoryName];
		const item		= category && category.items ? category.items[itemName] : undefined;

		const amount	= item && item.amount !== undefined ?
			item.amount :
			customAmount
		;

		if (amount === undefined || isNaN(amount) || amount < 0 || item === undefined) {
			throw new Error('Invalid updateCart arguments.');
		}

		this.cart.next({
			amount,
			apiKey,
			categoryID: category.id,
			categoryName,
			itemID: item.id,
			itemName,
			subscriptionType: item.subscriptionType
		});

		this.state.next(States.checkout);
	}

	constructor (
		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly signupService: SignupService,

		/** @ignore */
		private readonly titleService: Title
	) {
		super();

		/* Redirect to Onion site when on Tor */
		if (!this.envService.isOnion) {
			(async () => {
				const response: string	= await request({
					url: `https://ping.${this.configService.onionRoot}`
				}).catch(
					() => ''
				);

				if (response === 'pong') {
					locationData.href	=
						`https://${this.configService.onionRoot}/` +
						locationData.href.split(locationData.host + '/')[1]
					;
				}
			})();
		}

		if (!this.envService.isMobile) {
			new WOW({live: true}).init();
		}

		this.subscriptions.push(this.router.events.subscribe(e => {
			if (e instanceof NavigationEnd) {
				this.onUrlChange(e.url.split('?')[0]);
			}
		}));

		(async () => {
			/* Disable background video on mobile */

			await waitForIterable(elements.backgroundVideo);

			if (this.envService.isMobile) {
				const $mobilePoster: JQuery	= $(document.createElement('img'));
				$mobilePoster.attr('src', elements.backgroundVideo().attr('mobile-poster') || '');

				elements.backgroundVideo().replaceWith($mobilePoster).remove();
				elements.backgroundVideo	= () => $mobilePoster;
			}
			else {
				try {
					(<HTMLVideoElement> elements.backgroundVideo()[0]).currentTime	= 1.25;
				}
				catch {}

				(<any> elements.backgroundVideo()).appear().
					on('appear', () => {
						try {
							(<any> elements.backgroundVideo()[0]).play().catch(() => {});
						}
						catch {}
					}).
					on('disappear', () => {
						try {
							(<HTMLVideoElement> elements.backgroundVideo()[0]).pause();
						}
						catch {}
					})
				;
			}

			/* Carousels */

			await waitForIterable(elements.featuresSection);
			await waitForIterable(elements.testimonialsSection);

			this.featureCarousel.next(new Carousel(elements.featuresSection(), true));
			this.testimonialCarousel.next(new Carousel(
				elements.testimonialsSection(),
				this.envService.isMobile
			));

			/* Header / new cyph button animation */

			await waitForIterable(elements.mainToolbar);

			let expanded	= this.router.routerState.snapshot.url === '';
			elements.mainToolbar().toggleClass('new-cyph-expanded', expanded);

			(async () => {
				await sleep(3000);

				while (true) {
					await sleep(500);

					const shouldExpand	= this.state.value === States.home && (
						(
							this.promo.value === undefined &&
							elements.heroText().is(':appeared')
						) ||
						elements.footer().is(':appeared')
					);

					if (expanded === shouldExpand) {
						continue;
					}

					expanded	= shouldExpand;
					elements.mainToolbar().toggleClass('new-cyph-expanded', expanded);
				}
			})();

			/* Hero section feature rotation */

			(async () => {
				while (true) {
					await sleep(4200);
					this.cycleFeatures();
				}
			})();

			/* Load complete */

			await waitForIterable(elements.heroSection);
			$(document.body).addClass('load-complete');
			await sleep(5000);
			$('#pre-load').remove();
		})();
	}
}
