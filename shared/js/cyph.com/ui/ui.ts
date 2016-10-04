import {CyphDemo} from './cyphdemo';
import {Elements} from './elements';
import {HomeSections, Promos, States} from './enums';
import * as Cyph from '../../cyph/cyph';


/**
 * Controls the entire cyph.com UI.
 */
export class UI extends Cyph.UI.BaseButtonManager {
	private static linkInterceptSelector: string	= 'a[href^="/"]:not(a[href^="/blog"])';


	/** UI state/view. */
	public state: States				= States.home;

	/** Promo promo page state/view. */
	public promo: Promos				= Promos.none;

	public contactState	= {
		fromEmail: <string> '',
		fromName: <string> '',
		message: <string> '',
		sent: <boolean> false,
		subject: <string> '',
		to: <string> 'hello'
	};

	public features						= ['Video Calls', 'Voice Calls', 'Chats', 'Photos', 'File Transfers'];
	public featureIndex: number			= 0;

	/** Donation amount in dollars (default). */
	public donationAmount: number		= 10;

	/** Pricing states */
	public individual: boolean			= false;
	public business: boolean			= false;
	public telehealth: boolean			= false;

	/** Amount, Category, and Item in Cart */
	public cart = [0, 0, 0];

	/** Beta Pricing */
	public betaPlan = 499;

	/** Fixed Business Pricing */
	public theBasics: number			= 99; // "The Basics" Plan
	public theWorks: number				= 499; // "The Works" Plan

	/** Fixed Telehealth Pricing */
	public telehealthSingle: number		= 499; // Single Practitioner Price (default)

	/** Custom Telehealth Pricing */
	public doctors: number				= 5;	// Number of Doctors (default)
	public pricePerDoctor: number		= 350;	// Price per Doctor
	public telehealthPriceBreak: number	= 5;	// Number of Doctors required for price break
	public telehealthDiscount: number	= 0.10;	// Percentage discount when > telehealthPriceBreak
	public customDoctorPricing: number;

	/** Home page state/view. */
	public homeSection: HomeSections;

	/** Cyph demo animation. */
	public cyphDemo: CyphDemo;

	/** Signup form to be displayed throughout the site. */
	public signupForm: Cyph.UI.ISignupForm;

	/** Carousel of features. */
	public featureCarousel: Cyph.UI.Carousel;

	/** Carousel of testimonials. */
	public testimonialCarousel: Cyph.UI.Carousel;

	private linkClickHandler (e: Event) {
		e.preventDefault();

		const href: string		= $(e.currentTarget).attr('href');
		let scrollDelay: number	= 500;

		if (href !== locationData.pathname || this.homeSection !== undefined) {
			scrollDelay	= 0;

			Cyph.UrlState.set(href);
		}

		if (this.homeSection === undefined) {
			setTimeout(() => this.scroll(0), scrollDelay);
		}
	}

	private onUrlStateChange (urlState: string) : void {
		const urlStateSplit: string[]	= urlState.split('/');
		const urlStateBase: string		= urlStateSplit[0];

		const state: States	= States[urlStateBase];
		const promo: Promos	= Promos[urlStateBase];

		this.homeSection	= promo === undefined ?
			HomeSections[urlStateBase] :
			HomeSections.promo
		;

		if (this.homeSection !== undefined) {
			this.changeState(States.home);

			if (promo) {
				this.promo				= promo;
				this.signupForm.promo	= Promos[promo];
			}

			setTimeout(() => {
				if (this.homeSection === HomeSections.register) {
					this.dialogManager.baseDialog({
						template: Cyph.UI.Templates.register,
						locals: {
							signupForm: this.signupForm,
							Cyph: self['Cyph']
						},
						onclose: () => Cyph.UrlState.set('')
					});
				}
				else if (this.homeSection === HomeSections.invite) {
					this.signupForm.data.inviteCode	= Cyph.UrlState.get().split(HomeSections[HomeSections.invite] + '/')[1] || '';

					this.dialogManager.baseDialog({
						template: Cyph.UI.Templates.invite,
						locals: {
							signupForm: this.signupForm,
							Cyph: self['Cyph']
						},
						onclose: () => Cyph.UrlState.set('')
					});
				}
				else {
					this.scroll(
						$('#' + HomeSections[this.homeSection] + '-section').offset().top -
						(
							this.homeSection === HomeSections.gettingstarted ?
								-1 :
								Elements.mainToolbar.height()
						)
					);
				}
			}, 250);
		}
		else if (state === States.contact) {
			const to: string	= urlStateSplit[1];
			if (Cyph.Config.cyphEmailAddresses.indexOf(to) > -1) {
				this.contactState.to	= to;
			}

			this.changeState(state);
		}
		else if (state !== undefined) {
			this.changeState(state);
		}
		else if (urlStateBase === '') {
			this.changeState(States.home);
		}
		else if (urlStateBase === Cyph.UrlState.states.notFound) {
			this.changeState(States.error);
		}
		else {
			Cyph.UrlState.set(Cyph.UrlState.states.notFound);
			return;
		}

		Cyph.UrlState.set(urlState, true, true);
	}

	private scroll (
		position: number,
		delayFactor: number = 0.75,
		oncomplete?: Function
	) : void {
		const delay: number	=
			delayFactor *
			Math.abs(Cyph.UI.Elements.document.scrollTop() - position)
		;

		Cyph.UI.Elements.html.add(Cyph.UI.Elements.body).animate({
			scrollTop: position
		}, delay);

		if (oncomplete) {
			setTimeout(oncomplete, delay + 50);
		}
	}

	public updateCart (
		amount: number,
		category: number,
		item: number
	) : void {
		this.cart[0] = amount;
		this.cart[1] = category;
		this.cart[2] = item;
		this.changeState(States.checkout);
	}

	public pricing () : void {
		this.changeState(States.pricing);
		return;
	}

	public doctorPricing() {
		if(this.doctors >= this.telehealthPriceBreak){
			this.customDoctorPricing = (this.doctors * this.pricePerDoctor) - (this.doctors * this.pricePerDoctor * this.telehealthDiscount);
		}
		else {
			this.customDoctorPricing =  this.doctors * this.pricePerDoctor;
		}
		return this.customDoctorPricing;
	}

	public cycleFeatures(){
			if(this.featureIndex < this.features.length-1){
				this.featureIndex++;
				this.controller.update();
			}else{
				this.featureIndex = 0;
				this.controller.update();
			}
	}

	/**
	 * Changes UI state.
	 * @param state
	 */
	public changeState (state: States) : void {
		this.state	= state;
		this.controller.update();
	}

	/**
	 * @param controller
	 */
	public constructor (
		controller: Cyph.IController,
		mobileMenu: () => Cyph.UI.ISidebar,
		private dialogManager: Cyph.UI.IDialogManager
	) {
		super(controller, mobileMenu);

		this.signupForm	= new Cyph.UI.SignupForm(this.controller);
		this.cyphDemo	= new CyphDemo(this.controller, this.dialogManager);

		Cyph.UrlState.onchange(urlState => this.onUrlStateChange(urlState));

		const urlState: string	= Cyph.UrlState.get();
		setTimeout(
			() => Cyph.UrlState.set(urlState, true, false, false),
			HomeSections[urlState] === undefined ? 0 : 2500
		);


		const wowDelay: string			= 'data-wow-delay';
		const platformWowDelay: string	= Cyph.Env.platformString + '-' + wowDelay;

		$('[' + platformWowDelay + ']').each((i: number, elem: HTMLElement) => {
			const $this: JQuery	= $(elem);
			$this.attr(wowDelay, $this.attr(platformWowDelay));
		});

		const platformClass: string	= Cyph.Env.platformString + '-class-';

		$('[class*="' + platformClass + '"]').each((i: number, elem: HTMLElement) => {
			const $this: JQuery	= $(elem);
			$this.attr(
				'class',
				$this.attr('class').replace(new RegExp(platformClass, 'g'), '')
			);
		});

		if (!Cyph.Env.isMobile) {
			new self['WOW']({live: true}).init();
		}


		/* Disable background video on mobile */

		if (Cyph.Env.isMobile) {
			const $mobilePoster: JQuery	= $('<img />');
			$mobilePoster.attr('src', Elements.backgroundVideo.attr('mobile-poster'));

			Elements.backgroundVideo.replaceWith($mobilePoster).remove();
			Elements.backgroundVideo	= $mobilePoster;
		}
		else {
			try {
				Elements.backgroundVideo[0]['currentTime']	= 1.25;
			}
			catch (_) {}

			setTimeout(() => Elements.backgroundVideo['appear']().
				on('appear', () => { try { Elements.backgroundVideo[0]['play'](); } catch (_) {} }).
				on('disappear', () => { try { Elements.backgroundVideo[0]['pause'](); } catch (_) {} })
			, 2000);
		}


		/* Carousels */

		this.featureCarousel		= new Cyph.UI.Carousel(Elements.featuresSection);

		this.testimonialCarousel	= new Cyph.UI.Carousel(Elements.testimonialsSection, () =>
			Elements.heroSection.css(
				'min-height',
				`calc(100vh - ${40 + (
					Cyph.Env.isMobile ?
						40 :
						Elements.testimonialsSection.height()
				)}px)`
			)
		);


		/* Header / new cyph button animation */

		Elements.mainToolbar.toggleClass('new-cyph-expanded', Cyph.UrlState.get() === '');
		setTimeout(() => setInterval(() => Elements.mainToolbar.toggleClass(
			'new-cyph-expanded',
			this.state === States.home && (
				(!this.promo && Elements.heroText.is(':appeared')) ||
				Cyph.UI.Elements.footer.is(':appeared')
			)
		), 500), 3000);;



		/* Section sizing

		if (!Cyph.Env.isMobile) {
			setInterval(() =>
				Elements.contentContainers.each((i: number, elem: HTMLElement) => {
					const $this: JQuery	= $(elem);

					$this.width(
						($this[0].innerText || $this.text()).
							split('\n').
							map((s: string) => (s.match(/[A-Za-z0-9]/g) || []).length).
							reduce((a: number, b: number) => Math.max(a, b))
						*
						parseInt($this.css('font-size'), 10) / 1.6
					);
				})
			, 2000);
		}
		*/


		/* Avoid full page reloads */

		$(UI.linkInterceptSelector).click(e => this.linkClickHandler(e));
		new MutationObserver(mutations => {
			for (let mutation of mutations) {
				for (let i = 0 ; i < mutation.addedNodes.length ; ++i) {
					const $elem: JQuery	= $(mutation.addedNodes[i]);

					if ($elem.is(UI.linkInterceptSelector)) {
						$elem.click(e => this.linkClickHandler(e));
					}
					else {
						$elem.
							find(UI.linkInterceptSelector).
							click(e => this.linkClickHandler(e))
						;
					}
				}
			}
		}).observe(document.body, {
			childList: true,
			attributes: false,
			characterData: false,
			subtree: true
		});

		setInterval(() => this.cycleFeatures(), 4200);
		setTimeout(() => Cyph.UI.Elements.html.addClass('load-complete'), 100);

		/* Cyphertext easter egg */
		new self['Konami'](() => {
			Cyph.UrlState.set('intro');
			Cyph.Util.retryUntilComplete(retry => {
				if (
					this.cyphDemo.desktop &&
					this.cyphDemo.desktop.state === Cyph.UI.Chat.States.chat
				) {
					if (Cyph.Env.isMobile) {
						this.cyphDemo.mobile.cyphertext.show();
					}
					else {
						this.cyphDemo.desktop.cyphertext.show();
						setTimeout(() => this.cyphDemo.mobile.cyphertext.show(), 8000);
					}
				}
				else {
					retry();
				}
			});
		});
	}
}
