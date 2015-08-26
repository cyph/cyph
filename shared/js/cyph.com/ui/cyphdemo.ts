module Cyph.com {
	export module UI {
		/**
		 * Controls the Cyph chat demo.
		 */
		export class CyphDemo extends Cyph.UI.BaseButtonManager {
			private static demoClass: string	= 'demo';

			private static facebookPicUrl: string			= Cyph.Env.isMobile ?
				`data:image/jpeg;base64,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` :
				`data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=`
			;

			private static facebookPicMessage: string		=
				'![](' + CyphDemo.facebookPicUrl + ')'
			;

			private static facebookPicFrame: string			= Cyph.Env.isMobile ? '' : `
				<div class='facebook-pic image-frame real'>
					<iframe
						src='https://www.facebook.com/plugins/comments.php?href=https://www.${Util.generateGuid(Util.random(20, 5))}.com'
					></iframe>
				</div>
			`;

			private static facebookPicPlaceholder: string	= `
				<div class='facebook-pic image-frame'>&nbsp;</div>
			`;

			private static mobileUIScale: number	= 0.625;

			private static messages: { text: string; isMobile: boolean; }[]	= [
				{text: `why did we have to switch from Facebook?`, isMobile: true},
				{text: `haven't you watched the news lately? all the email leaks, hacking, and government surveillance...?`, isMobile: false},
				{text: `unlike Facebook, Cyph is end-to-end encrypted, so no one but us can read this`, isMobile: false},
				{text: `I guess.. but I don't know what interest anyone would have in spying on me`, isMobile: true},
				{text: `well I have to be extra careful; the mafia is looking for me`, isMobile: false},
				{text: `I don't believe you :expressionless:`, isMobile: true},
				{text: `all right fine, it just creeps me out that *someone* might have been reading our conversation`, isMobile: false},
				{text: `anyway, you think this pic is approriate for LinkedIn?`, isMobile: false},
				{text: CyphDemo.facebookPicMessage, isMobile: false},
				{text: `lol yeah, looks great ;)`, isMobile: true},
				{text: `cool, gotta run`, isMobile: false},
				{text: `ttyl :v:`, isMobile: true}
			];

			private static getOffset (elem: JQuery, ancestor: JQuery) : { left: number; top: number; } {
				const elemOffset		= elem.offset();
				const ancestorOffset	= ancestor.offset();

				return {
					left: Math.ceil(elemOffset.left - ancestorOffset.left),
					top: Math.ceil(elemOffset.top - ancestorOffset.top)
				};
			}


			private isActive: boolean;

			/** Desktop chat UI. */
			public desktop: Cyph.UI.Chat.IChat;

			/** Mobile chat UI. */
			public mobile: Cyph.UI.Chat.IChat;

			private resize (forceActive?: boolean, oncomplete: Function = () => {}) : void {
				const isActive: boolean	= forceActive || (
					!Elements.heroText.is(':appeared') &&
					Elements.demoRoot.is(':appeared')
				);

				if (this.isActive !== isActive) {
					if (!Elements.backgroundVideo[0]['paused']) {
						setTimeout(() => {
							try {
								if (Elements.backgroundVideo.is(':appeared')) {
									Elements.backgroundVideo[0]['play']();
								}
							}
							catch (_) {}
						}, 2000);
					}

					try {
						Elements.backgroundVideo[0]['pause']();
					}
					catch (_) {}
				}

				this.isActive	= isActive;

				setTimeout(() => {
					if (this.isActive) {
						this.resizeDesktop();
						setTimeout(() => this.resizeMobile(), 500);
					}
					else {
						Elements.screenshotLaptop.
							add(Elements.screenshotPhone).
							each((i: number, elem: HTMLElement) => setTimeout(() => {
								const $this: JQuery	= $(elem);

								$this.css({
									'width': '',
									'margin-top': '',
									'margin-left': ''
								});

								setTimeout(() =>
									$this.removeClass(CyphDemo.demoClass)
								, 500);
							}, i * 1000))
						;
					}

					setTimeout(oncomplete, 1100);
				}, 250);
			}

			private resizeDesktop () : void {
				const width: number		= Math.floor(
					(Cyph.UI.Elements.window.width() - 70) * 0.47 / 0.75
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
					(Cyph.UI.Elements.window.width() - 70) * 0.26 / 1.404
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

				Elements.demoRoot['appear']();
				Elements.heroText['appear']();

				const begin	= (e: Event) => {
					setTimeout(() => {
						this.resize(true, () => {
							Elements.demoRoot.css('opacity', 1);

							const $desktopFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);
							const $mobileFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);

							if (!Cyph.Env.isMobile) {
								Elements.demoListDesktop.append($desktopFacebookPic);
								Elements.demoListMobile.append($mobileFacebookPic);
							}

							setInterval(() => this.resize(), 2000);

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
								let totalDelay: number	= 7500;

								CyphDemo.messages.forEach(message => {
									const chat: Cyph.UI.Chat.IChat	=
										message.isMobile ?
											this.mobile :
											this.desktop
									;

									const text: string		= Util.translate(message.text);
									const maxDelay: number	= text.length > 15 ? 500 : 250;
									const minDelay: number	= 125;

									totalDelay += Util.random(maxDelay, minDelay);

									if (text !== CyphDemo.facebookPicMessage) {
										text.split('').forEach((c: string) => {
											setTimeout(() => {
												chat.currentMessage += c;
												this.controller.update();
											}, totalDelay);

											totalDelay += Util.random(50, 10);
										});
									}

									totalDelay += Util.random(maxDelay, minDelay);

									setTimeout(() => {
										chat.currentMessage	= '';
										chat.send(text);

										if (!Cyph.Env.isMobile && text === CyphDemo.facebookPicMessage) {
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

													const $placeholder: JQuery	= $(
														CyphDemo.facebookPicPlaceholder
													);

													$this.parent().replaceWith($placeholder);

													setTimeout(() => {
														const offset	= CyphDemo.getOffset(
															$placeholder,
															isDesktop ?
																Elements.demoListDesktop :
																Elements.demoListMobile
														);

														if (!isDesktop) {
															offset.left	= Math.ceil(
																offset.left / CyphDemo.mobileUIScale
															);

															offset.top	= Math.ceil(
																offset.top / CyphDemo.mobileUIScale
															);
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
						});
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
