import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import * as $ from 'jquery';
import * as WOW from 'wowjs';
import {Email} from '../cyph/email';
import {eventManager} from '../cyph/event-manager';
import {ConfigService} from '../cyph/services/config.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {SignupService} from '../cyph/services/signup.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {util} from '../cyph/util';
import {Carousel} from './carousel';
import {elements} from './elements';
import {HomeSections, pageTitles, Promos, States, wpstaticPages} from './enums';


/**
 * Angular service for Cyph home page.
 */
@Injectable()
export class AppService {
	/** @ignore */
	private static readonly linkInterceptSelector: string	=
		'a[href^="/"]' + wpstaticPages.map(s => `:not(a[href^='/${s}'])`).join('')
	;


	/** Business pricing state. */
	public readonly business: boolean	= false;

	/** Amount, category, and item respectively in cart. */
	public cart: {
		amount: number;
		category: number;
		item: number;
		subscription: boolean;
	};

	/** @see Email */
	public readonly contact: Email			= new Email('hello');

	/** Donation amount in dollars. */
	public readonly donationAmount: number	= 10;

	/** Carousel of features. */
	public featureCarousel: Carousel;

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
	public homeSection: HomeSections|undefined;

	/** Individual pricing state. */
	public readonly individual: boolean	= false;

	/** @see Promos */
	public promo: Promos|undefined;

	/** @see Promos */
	public promos: typeof Promos		= Promos;

	/** @see States */
	public state: States				= States.home;

	/** @see States */
	public states: typeof States		= States;

	/** Telehealth pricing state. */
	public readonly telehealth: boolean	= false;

	/** Carousel of testimonials. */
	public testimonialCarousel: Carousel;

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
	private async linkClickHandler (e: Event) : Promise<void> {
		e.preventDefault();

		const href		= $(e.currentTarget).attr('href');
		let scrollDelay	= 500;

		if (href !== locationData.pathname || this.homeSection !== undefined) {
			scrollDelay	= 0;

			this.urlStateService.setUrl(href);
		}

		if (this.homeSection === undefined) {
			await util.sleep(scrollDelay);
			this.scroll(0);
		}
	}

	/** @ignore */
	private async onUrlStateChange (newUrlState: string) : Promise<void> {
		const newUrlStateSplit: string[]	= newUrlState.split('/');
		const newUrlStateBase: string		= newUrlStateSplit[0];

		const state: States|undefined	= (<any> States)[newUrlStateBase];
		const promo: Promos|undefined	= (<any> Promos)[newUrlStateBase];

		this.homeSection	= promo === undefined ?
			(<any> HomeSections)[newUrlStateBase] :
			HomeSections.promo
		;

		this.titleService.setTitle(
			(<any> pageTitles)[newUrlStateBase] || pageTitles.defaultTitle
		);

		this.urlStateService.setUrl(newUrlState, true, true);

		if (this.homeSection !== undefined) {
			this.state	= States.home;

			if (promo !== undefined) {
				this.promo				= promo;

				eventManager.trigger(
					SignupService.promoEvent,
					Promos[promo]
				);
			}

			await util.sleep();

			if (this.homeSection === HomeSections.register) {
				await this.dialogService.baseDialog({
					template: `
						<md-dialog>
							<cyph-beta-register></cyph-beta-register>
						</md-dialog>
					`
				});

				this.urlStateService.setUrl('');
			}
			else if (this.homeSection === HomeSections.invite) {
				eventManager.trigger(
					SignupService.inviteEvent,
					this.urlStateService.getUrl().split(
						`${HomeSections[HomeSections.invite]}/`
					)[1] || ''
				);

				await this.dialogService.baseDialog({
					template: `
						<md-dialog>
							<cyph-beta-register [invite]='true'></cyph-beta-register>
						</md-dialog>
					`
				});

				this.urlStateService.setUrl('');
			}
			else {
				this.scroll(
					$('#' + HomeSections[this.homeSection] + '-section').offset().top -
					(
						this.homeSection === HomeSections.gettingstarted ?
							-1 :
							elements.mainToolbar().height()
					)
				);
			}
		}
		else if (state === States.checkout) {
			try {
				const category: string	= newUrlStateSplit[1];
				const item: string		= newUrlStateSplit[2].replace(
					/-(.)/g,
					(_, s) => s.toUpperCase()
				);

				const amount	=
					this.configService.pricingConfig.categories[category].items[item].amount
				;

				this.updateCart(
					amount,
					this.configService.pricingConfig.categories[category].id,
					this.configService.pricingConfig.categories[category].items[item].id,
					amount > 0
				);
			}
			catch (_) {
				this.urlStateService.setUrl(this.urlStateService.states.notFound);
			}
		}
		else if (state === States.contact) {
			const to: string	= newUrlStateSplit[1];
			if (this.configService.contactEmailAddresses.indexOf(to) > -1) {
				this.contact.to	= to;
			}

			this.state	= state;
		}
		else if (state !== undefined) {
			this.state	= state;
		}
		else if (newUrlStateBase === '') {
			this.state	= States.home;
		}
		else if (newUrlStateBase === this.urlStateService.states.notFound) {
			this.state	= States.error;
		}
		else {
			this.urlStateService.setUrl(this.urlStateService.states.notFound);
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
			Math.abs($(document).scrollTop() - position)
		;

		$(document.body).animate({scrollTop: position}, delay);

		if (onComplete) {
			await util.sleep(delay + 50);
			onComplete();
		}
	}

	/** Update cart and open checkout screen. */
	public updateCart (
		amount: number,
		category: number,
		item: number,
		subscription?: boolean
	) : void {
		this.cart	= {
			amount,
			category,
			item,
			subscription: subscription === true
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
		private readonly titleService: Title,

		/** @ignore */
		private readonly urlStateService: UrlStateService
	) {
		if (!this.envService.isMobile) {
			new WOW({live: true}).init();
		}

		(async () => {
			this.urlStateService.onChange(
				newUrlState => { this.onUrlStateChange(newUrlState); },
				false,
				true
			);

			const newUrlState: string	= this.urlStateService.getUrl();

			if ((<any> HomeSections)[newUrlState] !== undefined) {
				await util.waitForIterable(() => $('body.load-complete'));
				await util.sleep(500);
			}

			this.urlStateService.setUrl(newUrlState, true, false);
		})();

		(async () => {
			/* Disable background video on mobile */

			await util.waitForIterable(elements.backgroundVideo);

			if (this.envService.isMobile) {
				const $mobilePoster: JQuery	= $(document.createElement('img'));
				$mobilePoster.attr('src', elements.backgroundVideo().attr('mobile-poster'));

				elements.backgroundVideo().replaceWith($mobilePoster).remove();
				elements.backgroundVideo	= () => $mobilePoster;
			}
			else {
				try {
					(<HTMLVideoElement> elements.backgroundVideo()[0]).currentTime	= 1.25;
				}
				catch (_) {}

				(<any> elements.backgroundVideo()).appear().
					on('appear', () => {
						try {
							(<any> elements.backgroundVideo()[0]).play().catch(() => {});
						}
						catch (_) {}
					}).
					on('disappear', () => {
						try {
							(<HTMLVideoElement> elements.backgroundVideo()[0]).pause();
						}
						catch (_) {}
					})
				;
			}

			/* Carousels */

			await util.waitForIterable(elements.featuresSection);
			await util.waitForIterable(elements.testimonialsSection);

			this.featureCarousel		= new Carousel(elements.featuresSection(), true);
			this.testimonialCarousel	= new Carousel(
				elements.testimonialsSection(),
				this.envService.isMobile
			);

			/* Header / new cyph button animation */

			await util.waitForIterable(elements.mainToolbar);

			let expanded	= this.urlStateService.getUrl() === '';
			elements.mainToolbar().toggleClass('new-cyph-expanded', expanded);

			(async () => {
				await util.sleep(3000);

				while (true) {
					await util.sleep(500);

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

			/* Avoid full page reloads */

			$(AppService.linkInterceptSelector).click(e => { this.linkClickHandler(e); });
			new MutationObserver(mutations => {
				for (const mutation of mutations) {
					for (const elem of Array.from(mutation.addedNodes)) {
						const $elem: JQuery	= $(elem);

						if ($elem.is(AppService.linkInterceptSelector)) {
							$elem.click(e => { this.linkClickHandler(e); });
						}
						else {
							$elem.
								find(AppService.linkInterceptSelector).
								click(e => { this.linkClickHandler(e); })
							;
						}
					}
				}
			}).observe(document.body, {
				attributes: false,
				characterData: false,
				childList: true,
				subtree: true
			});

			(async () => {
				while (true) {
					await util.sleep(4200);
					this.cycleFeatures();
				}
			})();

			/* Load complete */

			await util.waitForIterable(elements.heroSection);
			$(document.body).addClass('load-complete');
		})();
	}
}
