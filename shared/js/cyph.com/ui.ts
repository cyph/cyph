import {config} from '../cyph/config';
import {env} from '../cyph/env';
import {BaseButtonManager} from '../cyph/ui/basebuttonmanager';
import {Carousel} from '../cyph/ui/carousel';
import * as Chat from '../cyph/ui/chat/enums';
import * as CyphElements from '../cyph/ui/elements';
import {IDialogManager} from '../cyph/ui/idialogmanager';
import {ISidebar} from '../cyph/ui/isidebar';
import {ISignupForm} from '../cyph/ui/isignupform';
import {SignupForm} from '../cyph/ui/signupform';
import {urlState} from '../cyph/urlstate';
import {util} from '../cyph/util';
import {CyphDemo} from './cyphdemo';
import {elements} from './elements';
import {HomeSections, pageTitles, Promos, States} from './enums';


/**
 * Controls the entire cyph.com UI.
 */
export class UI extends BaseButtonManager {
	/** @ignore */
	private static readonly linkInterceptSelector: string	= 'a[href^="/"]:not(a[href^="/blog"])';

	/** Initialisation event. */
	public static readonly uiInitEvent: string	= 'uiInitEvent';


	/** UI state/view. */
	public state: States				= States.home;

	/** Promo promo page state/view. */
	public promo: Promos				= Promos.none;

	/** Contact form state. */
	public readonly contactState		= {
		fromEmail: <string> '',
		fromName: <string> '',
		message: <string> '',
		sent: <boolean> false,
		subject: <string> '',
		to: <string> 'hello'
	};

	/** List of features to cycle through in hero section. */
	public readonly features: string[]	= [
		'Video Calls',
		'Voice Calls',
		'Chats',
		'Photos',
		'File Transfers'
	];

	/** Current feature displayed in hero section. */
	public featureIndex: number			= 0;

	/** Donation amount in dollars. */
	public readonly donationAmount: number			= 10;

	/** Individual pricing state. */
	public readonly individual: boolean				= false;

	/** Business pricing state. */
	public readonly business: boolean				= false;

	/** Telehealth pricing state. */
	public readonly telehealth: boolean				= false;

	/** Amount, category, and item respectively in cart. */
	public readonly cart: number[]					= [0, 0, 0];

	/** Beta plan price in dollars. */
	public readonly betaPlan: number				= 499;

	/** Business pricing: "The Basics" plan. */
	public readonly theBasics: number				= 99;

	/** Business pricing: "The Works" plan. */
	public readonly theWorks: number				= 499;

	/** Telehealth pricing: single-practicioner plan. */
	public readonly telehealthSingle: number		= 499;

	/** Custom telehealth pricing: number of doctors. */
	public readonly doctors: number					= 5;

	/** Custom telehealth pricing: price per doctor. */
	public readonly pricePerDoctor: number			= 350;

	/** Custom telehealth pricing: number of doctors required for price break. */
	public readonly telehealthPriceBreak: number	= 5;

	/** Custom telehealth pricing: % discount for price break. */
	public readonly telehealthDiscount: number		= 0.10;

	/** Home page state/view. */
	public homeSection: HomeSections;

	/** Cyph demo animation. */
	public readonly cyphDemo: CyphDemo;

	/** Signup form to be displayed throughout the site. */
	public readonly signupForm: ISignupForm;

	/** Carousel of features. */
	public featureCarousel: Carousel;

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
	private linkClickHandler (e: Event) : void {
		e.preventDefault();

		const href		= $(e.currentTarget).attr('href');
		let scrollDelay	= 500;

		if (href !== locationData.pathname || this.homeSection !== undefined) {
			scrollDelay	= 0;

			urlState.set(href);
		}

		if (this.homeSection === undefined) {
			setTimeout(() => this.scroll(0), scrollDelay);
		}
	}

	/** @ignore */
	private async onUrlStateChange (newUrlState: string) : Promise<void> {
		const newUrlStateSplit: string[]	= newUrlState.split('/');
		const newUrlStateBase: string		= newUrlStateSplit[0];

		const state: States	= (<any> States)[newUrlStateBase];
		const promo: Promos	= (<any> Promos)[newUrlStateBase];

		this.homeSection	= promo === undefined ?
			(<any> HomeSections)[newUrlStateBase] :
			HomeSections.promo
		;

		CyphElements.elements.title().text(
			(<any> pageTitles)[newUrlStateBase] || pageTitles.default
		);

		urlState.set(newUrlState, true, true);

		if (this.homeSection !== undefined) {
			this.changeState(States.home);

			if (promo) {
				this.promo				= promo;
				this.signupForm.promo	= Promos[promo];
			}

			await util.sleep();

			if (this.homeSection === HomeSections.register) {
				await this.dialogManager.baseDialog({
					locals: {
						signupForm: this.signupForm
					},
					template: `
						<md-dialog>
							<cyph-register
								[signup-form]='locals.signupForm'
							></cyph-register>
						</md-dialog>
					`
				});

				urlState.set('');
			}
			else if (this.homeSection === HomeSections.invite) {
				this.signupForm.data.inviteCode	=
					urlState.get().split(HomeSections[HomeSections.invite] + '/')[1] || ''
				;

				await this.dialogManager.baseDialog({
					locals: {
						signupForm: this.signupForm
					},
					template: `
						<md-dialog>
							<cyph-register
								[invite]='true'
								[signup-form]='locals.signupForm'
							></cyph-register>
						</md-dialog>
					`
				});

				urlState.set('');
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
		else if (state === States.contact) {
			const to: string	= newUrlStateSplit[1];
			if (config.cyphEmailAddresses.indexOf(to) > -1) {
				this.contactState.to	= to;
			}

			this.changeState(state);
		}
		else if (state !== undefined) {
			this.changeState(state);
		}
		else if (newUrlStateBase === '') {
			this.changeState(States.home);
		}
		else if (newUrlStateBase === urlState.states.notFound) {
			this.changeState(States.error);
		}
		else {
			urlState.set(urlState.states.notFound);
		}
	}

	/** @ignore */
	private scroll (
		position: number,
		delayFactor: number = 0.75,
		oncomplete?: Function
	) : void {
		const delay: number	=
			delayFactor *
			Math.abs(CyphElements.elements.document().scrollTop() - position)
		;

		CyphElements.elements.html().add(
			CyphElements.elements.body()
		).animate(
			{scrollTop: position},
			delay
		);

		if (oncomplete) {
			setTimeout(oncomplete, delay + 50);
		}
	}

	/** Update cart and open checkout screen. */
	public updateCart (
		amount: number,
		category: number,
		item: number
	) : void {
		this.cart[0]	= amount;
		this.cart[1]	= category;
		this.cart[2]	= item;

		this.changeState(States.checkout);
	}

	/**
	 * Changes UI state.
	 * @param state
	 */
	public changeState (state: States) : void {
		this.state	= state;
	}

	constructor (
		mobileMenu: () => ISidebar,

		/** @ignore */
		private readonly dialogManager: IDialogManager
	) {
		super(mobileMenu);

		this.signupForm	= new SignupForm();
		this.cyphDemo	= new CyphDemo(this.dialogManager);

		(async () => {
			urlState.onchange(async (newUrlState) => this.onUrlStateChange(newUrlState));

			const newUrlState: string	= urlState.get();
			setTimeout(
				() => urlState.set(newUrlState, true, false, false),
				(<any> HomeSections)[newUrlState] === undefined ? 0 : 2500
			);

			await CyphElements.Elements.waitForElement(elements.backgroundVideo);
			await CyphElements.Elements.waitForElement(elements.featuresSection);
			await CyphElements.Elements.waitForElement(elements.heroSection);
			await CyphElements.Elements.waitForElement(elements.mainToolbar);
			await CyphElements.Elements.waitForElement(elements.testimonialsSection);


			if (!env.isMobile) {
				new (<any> self).WOW({live: true}).init();
			}


			/* Disable background video on mobile */

			if (env.isMobile) {
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

				setTimeout(
					() => (<any> elements.backgroundVideo()).appear().
						on('appear', () => {
							try {
								(<HTMLVideoElement> elements.backgroundVideo()[0]).play();
							}
							catch (_) {}
						}).
						on('disappear', () => {
							try {
								(<HTMLVideoElement> elements.backgroundVideo()[0]).pause();
							}
							catch (_) {}
						})
					,
					2000
				);
			}


			/* Carousels */

			this.featureCarousel		= new Carousel(elements.featuresSection());

			this.testimonialCarousel	= new Carousel(
				elements.testimonialsSection(),
				() => elements.heroSection().css(
					'min-height',
					`calc(100vh - ${40 + (
						env.isMobile ?
							40 :
							elements.testimonialsSection().height()
					)}px)`
				)
			);


			/* Header / new cyph button animation */

			elements.mainToolbar().toggleClass(
				'new-cyph-expanded',
				urlState.get() === ''
			);

			setTimeout(
				() => setInterval(
					() => elements.mainToolbar().toggleClass(
						'new-cyph-expanded',
						this.state === States.home && (
							(
								this.promo === Promos.none &&
								!env.isMobile &&
								elements.heroText().is(':appeared')
							) ||
							CyphElements.elements.footer().is(':appeared')
						)
					),
					500
				),
				3000
			);


			/* Section sizing

			if (!env.isMobile) {
				setInterval(() =>
					elements.contentContainers().each((i: number, elem: HTMLElement) => {
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
					for (let elem of mutation.addedNodes) {
						const $elem: JQuery	= $(elem);

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
				attributes: false,
				characterData: false,
				childList: true,
				subtree: true
			});

			setInterval(() => this.cycleFeatures(), 4200);
			setTimeout(() => CyphElements.elements.html().addClass('load-complete'), 750);

			/* Cyphertext easter egg */
			/* tslint:disable-next-line:no-unused-new */
			new (<any> self).Konami(() => {
				urlState.set('intro');
				util.retryUntilComplete(retry => {
					if (
						this.cyphDemo.desktop &&
						this.cyphDemo.desktop.state === Chat.States.chat
					) {
						if (env.isMobile) {
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
		})();
	}
}
