import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {NavigationEnd, Router} from '@angular/router';
import * as $ from 'jquery';
import * as WOW from 'wowjs';
import {SubscriptionTypes} from '../cyph/checkout';
import {BetaRegisterComponent} from '../cyph/components/beta-register';
import {ConfigService} from '../cyph/services/config.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {SignupService} from '../cyph/services/signup.service';
import {request} from '../cyph/util/request';
import {sleep, waitForIterable} from '../cyph/util/wait';
import {Carousel} from './carousel';
import {elements} from './elements';
import {HomeSections, pageTitles, Promos, States} from './enums';


/**
 * Angular service for Cyph home page.
 */
@Injectable()
export class AppService {
	/** @ignore */
	private disableNextScroll: boolean	= false;

	/** Amount, category, and item in cart. */
	public cart?: {
		amount: number;
		category: number;
		item: number;
		subscriptionType?: SubscriptionTypes;
	};

	/** @see ClaimUsernameComponent.email. */
	public claimUsernameEmail?: string;

	/** @see ContactComponent.to. */
	public contactTo?: string;

	/** Donation amount in dollars. */
	public donationAmount: number	= 10;

	/** Carousel of features. */
	public featureCarousel?: Carousel;

	/** Current feature displayed in hero section. */
	public featureIndex: number			= 0;

	/** List of features to cycle through in hero section. */
	public readonly features: string[]	= [
		'Video Calls',
		'Voice Calls',
		'Chats',
		'Photos',
		'File Transfers'
	];

	/** @see HomeSections */
	public homeSection?: HomeSections;

	/** @see Promos */
	public promo?: Promos;

	/** @see States */
	public state: States	= States.home;

	/** Carousel of testimonials. */
	public testimonialCarousel?: Carousel;

	/** @ignore */
	private cycleFeatures () : void {
		if (this.featureIndex < this.features.length - 1) {
			this.featureIndex++;
		}
		else {
			this.featureIndex	= 0;
		}
	}

	/** @ignore */
	/* tslint:disable-next-line:cyclomatic-complexity */
	private async onUrlChange (url: string) : Promise<void> {
		/* Workaround to allow triggering this method
			even when URL hasn't changed (e.g. for scrolling). */
		this.router.navigated	= false;

		/* Workaround for Prefinery bug */
		/* tslint:disable-next-line:tab-equals */
		if (location.search && location.search.match(/^\?r=/)) {
			this.router.navigate(['invite', location.search.split('r=')[1] || '']);
			return;
		}
		/* tslint:disable-next-line:tab-equals */
		else if (location.search && location.search.match(/^\?ref-check=/)) {
			this.router.navigate(['waitlisttrack']);
			return;
		}

		const urlSegmentPaths: string[]	= url.split('/').slice(1);
		const urlBasePath: string		= urlSegmentPaths[0];

		const state: States|undefined	= (<any> States)[urlBasePath];
		const promo: Promos|undefined	= (<any> Promos)[urlBasePath];

		this.homeSection	= promo === undefined ?
			(<any> HomeSections)[urlBasePath] :
			HomeSections.promo
		;

		this.titleService.setTitle(
			(<any> pageTitles)[urlBasePath] || pageTitles.defaultTitle
		);

		if (this.homeSection !== undefined) {
			this.state	= States.home;

			if (promo !== undefined) {
				this.promo					= promo;
				this.signupService.promo	= Promos[promo];
			}

			await sleep();

			switch (this.homeSection) {
				case HomeSections.register:
					await this.dialogService.baseDialog(BetaRegisterComponent);
					this.disableNextScroll	= true;
					this.router.navigate(['']);
					break;

				case HomeSections.invite:
					this.signupService.data.inviteCode	=
						urlSegmentPaths.join('/').split(
							`${HomeSections[HomeSections.invite]}/`
						)[1] || ''
					;

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
							$(`#${HomeSections[this.homeSection]}-section`).offset() ||
							{left: 0, top: 0}
						).top -
						(
							this.homeSection === HomeSections.gettingstarted ?
								-1 :
								(elements.mainToolbar().height() || 0)
						)
					);
			}

			return;
		}

		if (state === States.checkout) {
			try {
				const categoryID	= urlSegmentPaths[1];
				const itemID		= urlSegmentPaths[2].replace(
					/-(.)/g,
					(_, s) => s.toUpperCase()
				);
				const amount		= parseFloat(urlSegmentPaths[3]);

				const category	= this.configService.pricingConfig.categories[categoryID];
				const item		= category && category.items ? category.items[itemID] : undefined;

				if (isNaN(amount) || amount < 0 || item === undefined) {
					throw new Error('Invalid checkout arguments.');
				}

				this.updateCart(amount, category.id, item.id, item.subscriptionType);
			}
			catch {
				this.router.navigate(['404']);
			}
		}
		else if (state === States.claimusername) {
			this.claimUsernameEmail	= urlSegmentPaths[1];
			this.state				= state;
		}
		else if (state === States.contact) {
			const to: string	= urlSegmentPaths[1];
			if (this.configService.contactEmailAddresses.indexOf(to) > -1) {
				this.contactTo	= to;
			}

			this.state	= state;
		}
		else if (state !== undefined) {
			this.state	= state;
		}
		else if (urlBasePath === '') {
			this.state	= States.home;
		}
		else if (urlBasePath === '404') {
			this.state	= States.error;
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

	/** Update cart and open checkout screen. */
	public updateCart (
		amount: number,
		category: number,
		item: number,
		subscriptionType?: SubscriptionTypes
	) : void {
		this.cart	= {
			amount,
			category,
			item,
			subscriptionType
		};

		this.state	= States.checkout;
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

		this.router.events.subscribe(e => {
			if (e instanceof NavigationEnd) {
				this.onUrlChange(e.url);
			}
		});

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

			this.featureCarousel		= new Carousel(elements.featuresSection(), true);
			this.testimonialCarousel	= new Carousel(
				elements.testimonialsSection(),
				this.envService.isMobile
			);

			/* Header / new cyph button animation */

			await waitForIterable(elements.mainToolbar);

			let expanded	= this.router.routerState.snapshot.url === '';
			elements.mainToolbar().toggleClass('new-cyph-expanded', expanded);

			(async () => {
				await sleep(3000);

				while (true) {
					await sleep(500);

					const shouldExpand	= this.state === States.home && (
						(
							this.promo === undefined &&
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
