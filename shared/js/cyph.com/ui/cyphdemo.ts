module Cyph.com {
	export module UI {
		/**
		 * Controls the Cyph chat demo.
		 */
		export class CyphDemo extends Cyph.UI.BaseButtonManager {
			private static demoClass: string			= 'demo';

			private static facebookPicUrl: string		=
				'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs='
			;
			private static facebookPicMessage: string	=
				'![](' + CyphDemo.facebookPicUrl + ')'
			;

			private static facebookPicFrame: string	= `
				<div class='facebook-pic image-frame real'>
					<iframe src='https://www.facebook.com/plugins/comments.php?api_key=113869198637480'></iframe>
				</div>
			`;

			private static facebookPicPlaceholder: string	= `
				<div class='facebook-pic image-frame'>&nbsp;</div>
			`;

			private static messages: { text: string; isMobile: boolean; }[]	= [
				{text: 'oh wow, that was fast!', isMobile: true},
				{text: 'but what’s the problem? why did we have to switch from Facebook?', isMobile: true},
				{text: 'haven’t you watched the news lately? all the email leaks, hacking, and government spying...?', isMobile: false},
				{text: 'unlike Facebook, Cyph is end-to-end encrypted, so no one but us can read this', isMobile: false},
				{text: 'oh yeah, I guess.. but I don’t know what interest anyone would have in me', isMobile: true},
				{text: 'well I have to be extra careful; a lot of people are looking for me', isMobile: false},
				{text: 'government people...', isMobile: false},
				{text: 'I don\'t believe you :expressionless:', isMobile: true},
				{text: 'okay fine, it just really creeps me out that *someone* might have been reading our conversation', isMobile: false},
				{text: 'I actually only wanted to ask, is this pic approriate for LinkedIn?', isMobile: false},
				{text: CyphDemo.facebookPicMessage, isMobile: false},
				{text: 'lol yeah, looks great ;)', isMobile: true}
			];

			private static getOffset (elem: JQuery, ancestor: JQuery) : { left: number; top: number; } {
				const elemOffset		= elem.offset();
				const ancestorOffset	= ancestor.offset();

				return {
					left: Math.ceil(elemOffset.left - ancestorOffset.left),
					top: Math.ceil(elemOffset.top - ancestorOffset.top)
				};
			}


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
					(Cyph.UI.Elements.window.width() - 60) * 0.55 / 0.75 + 2
				);

				const height: number	= width * 0.563 + 2;

				Elements.screenshotLaptop.addClass(CyphDemo.demoClass).css({
					width,
					'margin-top': Math.ceil(
						Elements.demoRootDesktop.offset().top -
						Elements.screenshotLaptop.offset().top -
						height * 0.104 +
						parseFloat(Elements.screenshotLaptop.css('margin-top')) -
						1
					),
					'margin-left': Math.ceil(
						Elements.demoRootDesktop.offset().left -
						Elements.screenshotLaptop.offset().left -
						width * 0.13 +
						parseFloat(Elements.screenshotLaptop.css('margin-left')) -
						1
					)
				});
			}

			private resizeMobile () : void {
				const width: number		= Math.floor(
					(Cyph.UI.Elements.window.width() - 60) * 0.3 / 1.404 + 2
				);

				const height: number	= width * 2.033 + 2;

				Elements.screenshotPhone.addClass(CyphDemo.demoClass).css({
					width,
					'margin-top': Math.ceil(
						Elements.demoRootMobile.offset().top -
						Elements.screenshotPhone.offset().top -
						height * 0.098 +
						parseFloat(Elements.screenshotPhone.css('margin-top')) -
						1
					),
					'margin-left': Math.ceil(
						Elements.demoRootMobile.offset().left -
						Elements.screenshotPhone.offset().left -
						width * 0.073 +
						parseFloat(Elements.screenshotPhone.css('margin-left')) -
						1
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

				Elements.demoRoot['appear']();
				Elements.heroText['appear']();

				const begin	= (e: Event) => {
					setTimeout(() => {
						this.resizeDesktop();

						setTimeout(() => {
							this.resizeMobile();

							Elements.demoRoot.css('opacity', 1);

							const $desktopFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);
							const $mobileFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);

							Elements.demoListDesktop.append($desktopFacebookPic);
							Elements.demoListMobile.append($mobileFacebookPic);

							let intervalId;
							const resize: Function	= () => {
								clearInterval(intervalId);
								intervalId	= setInterval(() => this.resize(), 2000);
								setTimeout(() => clearInterval(intervalId), 60000);
								this.resize();
							};

							setTimeout(() => resize(), 2000);
							Cyph.UI.Elements.window.on('resize', () => resize());
							Elements.heroText.on('appear', () => resize());

							let mobileSession: Cyph.Session.ISession;
							const desktopSession: Cyph.Session.ISession	= new Cyph.Session.Session(
								null,
								this.controller,
								undefined,
								(desktopChannel: Cyph.Channel.LocalChannel) => {
									mobileSession	= new Cyph.Session.Session(
										null,
										this.controller,
										undefined,
										(mobileChannel: Cyph.Channel.LocalChannel) =>
											desktopChannel.connect(mobileChannel)
									);
								}
							);

							this.desktop	= new Cyph.UI.Chat.Chat(
								this.controller,
								dialogManager,
								{open: () => {}, close: () => {}},
								{notify: (message: string) => {}},
								false,
								desktopSession,
								Elements.demoRootDesktop
							);

							this.mobile		= new Cyph.UI.Chat.Chat(
								this.controller,
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
									totalDelay += i * Util.random(250, 50);

									const chat: Cyph.UI.Chat.IChat	=
										message.isMobile ?
											this.mobile :
											this.desktop
									;

									if (message.text !== CyphDemo.facebookPicMessage) {
										message.text.split('').forEach((c: string) => {
											setTimeout(() => {
												chat.currentMessage += c;
												this.controller.update();
											}, totalDelay);

											totalDelay += Util.random(50, 10);
										});
									}

									totalDelay += Util.random(250, 50);

									setTimeout(() => {
										chat.currentMessage	= '';
										chat.send(message.text);

										if (message.text === CyphDemo.facebookPicMessage) {
											const innerTimeout: number	= 250;
											const outerTimeout: number	= 250;

											totalDelay += (innerTimeout + outerTimeout) * 1.5;

											setTimeout(() =>
												Elements.demoRoot.find(
													'.message-text > p > a > img:visible[src="' +
														CyphDemo.facebookPicUrl +
													'"]'
												).each((i: number, elem: HTMLElement) => {
													const $this: JQuery			= $(elem);

													const isDesktop: boolean	=
														$this.
															parentsUntil().
															index(Elements.demoListDesktop[0])
														> -1
													;

													const $facebookPic: JQuery	=
														isDesktop ?
															$desktopFacebookPic :
															$mobileFacebookPic
													;

													const $placeholder: JQuery	= $(CyphDemo.facebookPicPlaceholder);

													$this.parent().replaceWith($placeholder);

													setTimeout(() => {
														const offset	= CyphDemo.getOffset(
															$placeholder,
															isDesktop ?
																Elements.demoListDesktop :
																Elements.demoListMobile
														);

														if (!isDesktop) {
															const ratio: number	= 0.625;

															offset.left	= Math.ceil(offset.left / ratio);
															offset.top	= Math.ceil(offset.top / ratio);
														}

														$facebookPic.css(offset);
													}, innerTimeout);
												})
											, outerTimeout);
										}
									}, totalDelay);
								});

								totalDelay += 1000;

								setTimeout(() => {
									this.desktop.currentMessage	= '';
									this.mobile.currentMessage	= '';
									this.controller.update();
								}, totalDelay);
							}, 750);
						}, 750);
					}, 750);
				};

				setTimeout(() => {
					const intervalId	= setInterval(() => {
						if (!Elements.heroText.is(':appeared')) {
							clearInterval(intervalId);
							Elements.demoRoot.one('appear', begin);
						}
					}, 250);
				}, 1000);
			}
		}
	}
}
