module Cyph.com {
	export module UI {
		/**
		 * Controls the entire cyph.com UI.
		 */
		export class UI extends Cyph.UI.BaseButtonManager {
			private static testimonialActiveClass: string	= 'active';


			private testimonialNumber: number	= 0;

			private testimonialTimeout: any;

			/** UI state/view. */
			public state: States		= States.home;

			/** Podcast promo page state/view. */
			public podcast: Podcasts	= Podcasts.none;

			/** Home page state/view. */
			public homeSection: HomeSections;

			/** Cyph demo animation. */
			public cyphDemo: CyphDemo;

			/** Signup form to be displayed throughout the site. */
			public signupForm: Cyph.UI.ISignupForm;

			private onUrlStateChange (urlState: string) : void {
				const state: States		= States[urlState];
				const podcast: Podcasts	= Podcasts[urlState];

				this.homeSection	= HomeSections[urlState];

				if (podcast !== undefined) {
					this.openPodcastPage(podcast);
				}
				else if (this.homeSection !== undefined) {
					this.changeState(States.home);

					setTimeout(() => {
						if (this.homeSection === HomeSections.login) {
							this.dialogManager.baseDialog({
								template: Cyph.UI.Templates.login,
								vars: {
									signupForm: this.signupForm
								},
								onclose: () => Cyph.UrlState.set('')
							});
						}
						else {
							this.scroll(
								$('#' + urlState + '-section').offset().top -
								(
									this.homeSection === HomeSections.gettingstarted ?
										-1 :
										Elements.mainToolbar.height()
								)
							);
						}
					}, 250);
				}
				else if (state !== undefined) {
					this.changeState(state);
				}
				else if (urlState === '') {
					this.changeState(States.home);
				}
				else if (urlState === Cyph.UrlState.states.notFound) {
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

				setTimeout(oncomplete, delay + 50);
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
			 * Opens the podcast promo page with the indicated state.
			 * @param podcast
			 */
			public openPodcastPage (podcast: Podcasts) : void {
				this.podcast	= podcast;
				this.changeState(States.podcast);

				Elements.heroText.hide();
				Elements.podcastLogo.attr('src', '/img/thirdparty/' + Podcasts[this.podcast] + '.png');
				setTimeout(() => Elements.heroText.show(), 1);
			}

			/**
			 * Scrolls down and bounces in hero text.
			 */
			public scrollHeroText () : void {
				setTimeout(() => this.scroll(Elements.heroSection.height() - 100, 1.1), 250);
			}

			/**
			 * Sets the active testimonial to be displayed in the testimonial section.
			 * @param testimonialNumber
			 */
			public setTestimonial (testimonialNumber: number = this.testimonialNumber) : void {
				clearTimeout(this.testimonialTimeout);

				Elements.testimonialQuotes.parent().height(
					Elements.testimonialQuotes.
						map((i, elem: HTMLElement) => $(elem).height()).
						toArray().
						reduce((a: number, b: number) => Math.max(a, b))
				);

				Elements.testimonialLogos.
					add(Elements.testimonialQuotes).
					removeClass(UI.testimonialActiveClass)
				;

				setTimeout(() => Elements.testimonialLogos.eq(testimonialNumber).
					add(Elements.testimonialQuotes.eq(testimonialNumber)).
					addClass(UI.testimonialActiveClass)
				, 600);

				this.testimonialNumber	= testimonialNumber + 1;
				if (this.testimonialNumber >= Elements.testimonialLogos.length) {
					this.testimonialNumber	= 0;
				}

				this.testimonialTimeout	= setTimeout(
					() => this.setTestimonial(),
					Elements.testimonialQuotes.eq(testimonialNumber).text().length * 35
				);
			}

			/**
			 * @param controller
			 */
			public constructor (
				controller: Cyph.IController,
				mobileMenu: Cyph.UI.ISidebar,
				private dialogManager: Cyph.UI.IDialogManager,
				demoMobileMenu: Cyph.UI.ISidebar
			) {
				super(controller, mobileMenu);

				this.signupForm	= new Cyph.UI.SignupForm(this.controller);
				this.cyphDemo	= new CyphDemo(this.controller, this.dialogManager, demoMobileMenu);

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
					new self['WOW']({live: false}).init();
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
						on('appear', () => Elements.backgroundVideo[0]['play']()).
						on('disappear', () => Elements.backgroundVideo[0]['pause']())
					, 2000);
				}

				
				/* Testimonial slideshow */

				setTimeout(() => this.setTestimonial(), 1000);


				/* Header / new cyph button animation */

				if (!Cyph.Env.isMobile) {
					setInterval(() => {
						if (!Elements.demoRoot.is(':appeared')) {
							Elements.bouncingDownArrow.removeClass('bounce');
							setTimeout(() =>
								Elements.bouncingDownArrow.addClass('bounce animated')
							, 100);
						}
					}, 5000);
				}

				setInterval(() => Elements.newCyph.toggleClass('active',
					this.state === States.home &&
					Cyph.UI.Elements.body['scrollPosition']() === 0
				), 500);


				/* Avoid full page reloads */

				$('a[href^="/"]:not(a[href^="/blog"])').click(e => {
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
				});


				setTimeout(() => Cyph.UI.Elements.html.addClass('load-complete'), 100);
			}
		}
	}
}
