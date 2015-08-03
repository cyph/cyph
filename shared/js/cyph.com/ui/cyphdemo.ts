module Cyph.com {
	export module UI {
		/**
		 * Controls the Cyph chat demo.
		 */
		export class CyphDemo extends Cyph.UI.BaseButtonManager {
			private static demoClass: string	= 'demo';

			private static messages: { text: string; isMobile: boolean; }[]	= [
				{text: 'hallo :beer:', isMobile: false},
				{text: 'u wanna cheat on ur wife with me', isMobile: false},
				{text: 'sry, cant', isMobile: true},
				{text: 'ok', isMobile: false},
				{text: 'hows the kids', isMobile: true},
				{text: 'kids is kill', isMobile: false},
				{text: 'no', isMobile: true},
				{text: 'sry', isMobile: false},
				{text: 'when funeral', isMobile: true},
				{text: 'yesterday', isMobile: false},
				{text: 'oh', isMobile: true}
			];


			/** Desktop chat UI. */
			public desktop: Cyph.UI.Chat.IChat;

			/** Mobile chat UI. */
			public mobile: Cyph.UI.Chat.IChat;

			private resize () : void {
				if (Elements.heroText.is(':appeared')) {
					const screenshots: JQuery	= Elements.screenshotLaptop.
						add(Elements.screenshotPhone)
					;

					screenshots.css({
						'width': '',
						'margin-top': '',
						'margin-left': ''
					});

					setTimeout(() => screenshots.removeClass(CyphDemo.demoClass), 800);
				}
				else {
					this.resizeDesktop();
					this.resizeMobile();
				}
			}

			private resizeDesktop () : void {
				const width: number		= Math.floor(
					(Cyph.UI.Elements.window.width() - 60) * 0.55 / 0.75
				);

				const height: number	= width * 0.563;

				Elements.screenshotLaptop.addClass(CyphDemo.demoClass).css({
					width,
					'margin-top': Math.ceil(
						Elements.demoRootDesktop.offset().top -
						Elements.screenshotLaptop.offset().top -
						height * 0.104 +
						parseFloat(Elements.screenshotLaptop.css('margin-top'))
					),
					'margin-left': Math.ceil(
						Elements.demoRootDesktop.offset().left -
						Elements.screenshotLaptop.offset().left -
						width * 0.13 +
						parseFloat(Elements.screenshotLaptop.css('margin-left'))
					)
				});
			}

			private resizeMobile () : void {
				const width: number		= Math.floor(
					(Cyph.UI.Elements.window.width() - 60) * 0.3 / 1.404
				);

				const height: number	= width * 2.033;

				Elements.screenshotPhone.addClass(CyphDemo.demoClass).css({
					width,
					'margin-top': Math.ceil(
						Elements.demoRootMobile.offset().top -
						Elements.screenshotPhone.offset().top -
						height * 0.098 +
						parseFloat(Elements.screenshotPhone.css('margin-top'))
					),
					'margin-left': Math.ceil(
						Elements.demoRootMobile.offset().left -
						Elements.screenshotPhone.offset().left -
						width * 0.073 +
						parseFloat(Elements.screenshotPhone.css('margin-left'))
					)
				});
			}

			/**
			 * @param controller
			 */
			public constructor(
				controller: Cyph.IController,
				dialogManager: Cyph.UI.IDialogManager,
				mobileMenu: Cyph.UI.ISidebar
			) {
				super(controller, mobileMenu);

				Elements.demoRoot['appear']().one('appear', () => {
					setTimeout(() => {
						this.resizeDesktop();

						setTimeout(() => {
							this.resizeMobile();

							let intervalId;
							const resize: Function	= () => {
								clearInterval(intervalId);
								intervalId	= setInterval(() => this.resize(), 2000);
								setTimeout(() => clearInterval(intervalId), 60000);
								this.resize();
							};

							setTimeout(() => resize(), 2000);
							Cyph.UI.Elements.window.on('resize', () => resize());
							Elements.heroText['appear']().on('appear', () => resize());

							let mobileSession: Cyph.Session.ISession;
							const desktopSession: Cyph.Session.ISession	= new Cyph.Session.Session(
								null,
								controller,
								undefined,
								(desktopChannel: Cyph.Channel.LocalChannel) => {
									mobileSession	= new Cyph.Session.Session(
										null,
										controller,
										undefined,
										(mobileChannel: Cyph.Channel.LocalChannel) =>
											desktopChannel.connect(mobileChannel)
									);
								}
							);

							this.desktop	= new Cyph.UI.Chat.Chat(
								controller,
								dialogManager,
								{open: () => {}, close: () => {}},
								{notify: (message: string) => {}},
								false,
								desktopSession,
								Elements.demoRootDesktop
							);

							this.mobile		= new Cyph.UI.Chat.Chat(
								controller,
								dialogManager,
								this.mobileMenu,
								{notify: (message: string) => {}},
								true,
								mobileSession,
								Elements.demoRootMobile
							);

							setTimeout(() => {
								let totalDelay: number	= 5000;

								CyphDemo.messages.forEach((message, i: number) => {
									totalDelay += i * Util.random(1000, 250);

									const chat: Cyph.UI.Chat.IChat	=
										message.isMobile ?
											this.mobile :
											this.desktop
									;

									message.text.split('').forEach((c: string) => {
										setTimeout(() => {
											chat.currentMessage += c;
											controller.update();
										}, totalDelay);

										totalDelay += Util.random(250, 25);
									});

									totalDelay += Util.random(500, 250);

									setTimeout(() => chat.send(), totalDelay);
								});
							}, 750);
						}, 750);
					}, 750);
				});
			}
		}
	}
}
