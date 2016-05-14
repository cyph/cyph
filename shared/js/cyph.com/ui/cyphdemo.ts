import {Elements} from 'elements';
import * as Cyph from 'cyph/cyph';


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
				src='https://www.facebook.com/plugins/comments.php?href=https://www.${Cyph.Util.generateGuid(Cyph.Util.random(20, 5))}.com'
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
		/*
			{text: `anyway, you think this pic is approriate for LinkedIn?`, isMobile: false},
			{text: CyphDemo.facebookPicMessage, isMobile: false},
			{text: `lol yeah, looks great ;)`, isMobile: true},
			{text: `cool, gotta run`, isMobile: false},
			{text: `ttyl :v:`, isMobile: true}
		*/
		{text: `anyway, gotta run`, isMobile: false},
		{text: `cool, ttyl :wave:`, isMobile: true}
	];

	private static getOffset (elem: JQuery, ancestor: JQuery) : { left: number; top: number; } {
		const elemOffset		= elem.offset();
		const ancestorOffset	= ancestor.offset();

		return {
			left: Math.floor(elemOffset.left - ancestorOffset.left),
			top: Math.floor(elemOffset.top - ancestorOffset.top)
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
		dialogManager: Cyph.UI.IDialogManager
	) {
		super(controller);

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
						() => ({close: () => {}, open: () => {}}),
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

							const text: string		= Cyph.Util.translate(message.text);
							const maxDelay: number	= text.length > 15 ? 500 : 250;
							const minDelay: number	= 125;

							totalDelay += Cyph.Util.random(maxDelay, minDelay);

							if (text !== CyphDemo.facebookPicMessage) {
								text.split('').forEach((c: string) => {
									setTimeout(() => {
										chat.currentMessage += c;
										this.controller.update();
									}, totalDelay);

									totalDelay += Cyph.Util.random(50, 10);
								});
							}

							totalDelay += Cyph.Util.random(maxDelay, minDelay);

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
