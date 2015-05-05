module Cyph.com {
	export module UI {
		export class UI {
			private static fixedHeaderClass: string	= 'fixed-header';


			private backgroundVideoManager: BackgroundVideoManager;

			public state: States		= States.home;
			public podcast: Podcasts	= Podcasts.none;

			public signupForm: Cyph.UI.ISignupForm;

			private onScroll () : void {
				const viewportHeight: number	= Math.max(
					document.documentElement.clientHeight,
					window.innerHeight || 0
				);

				const scrollTop: number	= window.pageYOffset;

				if (scrollTop === 0) {
					Elements.newCyph.css({transform: '', top: ''});
					Elements.fixedHeaderStuff.removeClass(UI.fixedHeaderClass);
				}
				else if (scrollTop >= (Elements.newCyphParent.height() / 2 + 16)) {
					Elements.fixedHeaderStuff.addClass(UI.fixedHeaderClass);
				}
				else {
					Elements.fixedHeaderStuff.removeClass(UI.fixedHeaderClass);

					const ratio: number	= (viewportHeight - scrollTop) / viewportHeight;

					if (ratio > 0.62) {
						Elements.newCyph.css('transform', 'scale(' + ratio + ')');
					}
				}
			}

			private onUrlStateChange (urlState: string) : void {
				const state: States		= States[urlState];
				const podcast: Podcasts	= Podcasts[urlState];

				if (podcast !== undefined) {
					this.openPodcastPage(podcast);
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
				delayFactor: number = 0.75
			) : void {
				const delay: number	=
					delayFactor *
					Math.abs(Cyph.UI.Elements.document.scrollTop() - position)
				;

				Cyph.UI.Elements.html.add(Cyph.UI.Elements.body).animate({
					scrollTop: position
				}, delay);
			}

			public changeState (state: States) : void {
				this.state	= state;
				this.controller.update();
			}

			public openPodcastPage (podcast: Podcasts) : void {
				this.podcast	= podcast;
				this.changeState(States.podcast);

				Elements.heroText.hide();
				Elements.podcastLogo.attr('src', '/img/' + Podcasts[this.podcast] + '.png');
				setTimeout(() => Elements.heroText.show(), 1);
			}

			public scrollHeroText () : void {
				Elements.heroText.removeClass('bounceInDown').addClass('bounceOutRight');

				setTimeout(() => {
					this.scroll(Cyph.UI.Elements.window.height(), 1.1);

					setTimeout(() => {
						Elements.heroText.removeClass('bounceOutRight').addClass('bounceInDown');
					}, 250);
				}, 250);
			}

			public constructor (private controller: Cyph.IController) {
				this.backgroundVideoManager	= new BackgroundVideoManager();
				this.signupForm				= new Cyph.UI.SignupForm(this.controller);

				Cyph.UrlState.onchange(urlState => this.onUrlStateChange(urlState));
				Cyph.UrlState.set(Cyph.UrlState.get(), true, false, false);


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


				/* Header / new cyph button animation */

				if (Cyph.Env.isMobile) {
					Elements.fixedHeaderStuff.addClass(UI.fixedHeaderClass);
				}
				else {
					Cyph.UI.Elements.window.scroll(() => this.onScroll());

					setInterval(() => {
						Elements.bouncingDownArrow.removeClass('bounce');

						setTimeout(() => {
							Elements.bouncingDownArrow.addClass('bounce');
						}, 100);
					}, 2500);
				}


				/* No full page reloads */

				$('a[href^="/"]').click(e => {
					e.preventDefault();

					const href: string		= $(e.currentTarget).attr('href');
					let scrollDelay: number	= 500;

					if (href !== location.pathname) {
						scrollDelay	= 0;

						Cyph.UrlState.set(href);
						setTimeout(() => this.backgroundVideoManager.adjustMargins(), 500);
					}

					setTimeout(() => this.scroll(0), scrollDelay);
				});


				Cyph.UI.Elements.html.addClass('load-complete');
			}
		}
	}
}
