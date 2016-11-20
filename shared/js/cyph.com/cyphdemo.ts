import * as Cyph from '../cyph';
import {Elements} from './elements';


/**
 * Controls the Cyph chat demo.
 */
export class CyphDemo extends Cyph.UI.BaseButtonManager {
	/** @ignore */
	private static demoClass: string	= 'demo';

	/** @ignore */
	private static facebookPicUrl: string			=
		`data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=`
	;

	/** @ignore */
	private static facebookPicMessage: string		=
		'![](' + CyphDemo.facebookPicUrl + ')'
	;

	/** @ignore */
	private static facebookPicFrame: string			= Cyph.Env.isMobile ? '' : `
		<div class='facebook-pic image-frame real'>
			<iframe
				src='https://www.facebook.com/plugins/comments.php?href=https://www.${
					Cyph.Util.generateGuid(Cyph.Util.random(20, 5))
				}.com'
			></iframe>
		</div>
	`;

	/** @ignore */
	private static facebookPicPlaceholder: string	= `
		<div class='facebook-pic image-frame'>&nbsp;</div>
	`;

	/** @ignore */
	private static mobileUIScale: number	= 0.625;

	/** @ignore */
	private static messages: {text: string; isMobile: boolean}[]	= [
		{
			isMobile: true,
			text: `why did we have to switch from Facebook?`
		},
		{
			isMobile: false,
			text:
				`haven't you watched the news lately? all the email leaks, ` +
				`hacking, and government surveillance...?`
		},
		{
			isMobile: false,
			text: `unlike Facebook, Cyph is end-to-end encrypted, so no one but us can read this`
		},
		{
			isMobile: true,
			text: `I guess.. but I don't know what interest anyone would have in spying on me`
		},
		{
			isMobile: false,
			text: `well I have to be extra careful; the mafia is looking for me`
		},
		{
			isMobile: true,
			text: `I don't believe you :expressionless:`
		},
		{
			isMobile: false,
			text:
				`all right fine, it just creeps me out that *someone* ` +
				`might have been reading our conversation`
		},
		/*
			{
				isMobile: false,
				text: `anyway, you think this pic is appropriate for LinkedIn?`
			},
			{
				isMobile: false,
				text: CyphDemo.facebookPicMessage
			},
			{
				isMobile: true,
				text: `lol yeah, looks great ;)`
			},
			{
				isMobile: false,
				text: `cool, gotta run`
			},
			{
				isMobile: true,
				text: `ttyl :v:`
			}
		*/
		{
			isMobile: false,
			text: `anyway, gotta run`
		},
		{
			isMobile: true,
			text: `cool, ttyl :wave:`
		}
	];

	/** @ignore */
	private static getOffset (elem: JQuery, ancestor: JQuery) : {left: number; top: number} {
		const elemOffset		= elem.offset();
		const ancestorOffset	= ancestor.offset();

		return {
			left: Math.floor(elemOffset.left - ancestorOffset.left),
			top: Math.floor(elemOffset.top - ancestorOffset.top)
		};
	}


	/** @ignore */
	private isActive: boolean;

	/** Desktop chat UI. */
	public desktop: Cyph.UI.Chat.IChat;

	/** Mobile chat UI. */
	public mobile: Cyph.UI.Chat.IChat;

	/** @ignore */
	private resize (forceActive?: boolean, oncomplete?: Function) : void {
		const isActive: boolean	= forceActive || (
			!Elements.heroText().is(':appeared') &&
			Elements.demoRoot().is(':appeared')
		);

		if (this.isActive !== isActive) {
			if (!Elements.backgroundVideo()[0]['paused']) {
				setTimeout(() => {
					try {
						if (Elements.backgroundVideo().is(':appeared')) {
							try {
								Elements.backgroundVideo()[0]['play']();
							}
							catch (_) {}
						}
					}
					catch (_) {}
				}, 2000);
			}

			try {
				Elements.backgroundVideo()[0]['pause']();
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
				Elements.screenshotLaptop().
					add(Elements.screenshotPhone()).
					each((i: number, elem: HTMLElement) => setTimeout(() => {
						const $this: JQuery	= $(elem);

						$this.css({
							'margin-left': '',
							'margin-top': '',
							'width': ''
						});

						setTimeout(() =>
							$this.removeClass(CyphDemo.demoClass)
						, 500);
					}, i * 1000))
				;
			}

			if (oncomplete) {
				setTimeout(oncomplete, 1100);
			}
		}, 250);
	}

	/** @ignore */
	private resizeDesktop () : void {
		const width: number		= Math.floor(
			(Cyph.UI.Elements.window().width() - 70) * 0.47 / 0.75
		);

		const height: number	= width * 0.563;

		Elements.screenshotLaptop().addClass(CyphDemo.demoClass).css({
			width,
			'margin-left': Math.ceil(
				Elements.demoRootDesktop().offset().left -
				Elements.screenshotLaptop().offset().left -
				width * 0.13 +
				parseFloat(Elements.screenshotLaptop().css('margin-left'))
			),
			'margin-top': Math.ceil(
				Elements.demoRootDesktop().offset().top -
				Elements.screenshotLaptop().offset().top -
				height * 0.104 +
				parseFloat(Elements.screenshotLaptop().css('margin-top'))
			)
		});
	}

	/** @ignore */
	private resizeMobile () : void {
		const width: number		= Math.floor(
			(Cyph.UI.Elements.window().width() - 70) * 0.26 / 1.404
		);

		const height: number	= width * 2.033;

		Elements.screenshotPhone().addClass(CyphDemo.demoClass).css({
			width,
			'margin-left': Math.ceil(
				Elements.demoRootMobile().offset().left -
				Elements.screenshotPhone().offset().left -
				width * 0.073 +
				parseFloat(Elements.screenshotPhone().css('margin-left'))
			),
			'margin-top': Math.ceil(
				Elements.demoRootMobile().offset().top -
				Elements.screenshotPhone().offset().top -
				height * 0.098 +
				parseFloat(Elements.screenshotPhone().css('margin-top'))
			)
		});
	}

	constructor (dialogManager: Cyph.UI.IDialogManager) {
		super();

		(async () => {
			while (
				Elements.demoRoot().length < 1 ||
				Elements.heroText().length < 1
			) {
				await Cyph.Util.sleep();
			}

			Elements.demoRoot()['appear']();
			Elements.heroText()['appear']();

			await Cyph.Util.sleep(1000);
			while (Elements.heroText().is(':appeared')) {
				await Cyph.Util.sleep();
			}

			Elements.demoRoot().one('appear', async (e: Event) => {
				await Cyph.Util.sleep(750);

				this.resize(true, async () => {
					Elements.demoRoot().css('opacity', 1);

					const $desktopFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);
					const $mobileFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);

					if (!Cyph.Env.isMobile) {
						Elements.demoListDesktop().append($desktopFacebookPic);
						Elements.demoListMobile().append($mobileFacebookPic);
					}

					setInterval(() => this.resize(), 2000);

					let mobileSession: Cyph.Session.ISession;
					const desktopSession: Cyph.Session.ISession	= new Cyph.Session.Session(
						null,
						false,
						undefined,
						(desktopChannel: Cyph.Channel.LocalChannel) => {
							mobileSession	= new Cyph.Session.Session(
								null,
								false,
								undefined,
								(mobileChannel: Cyph.Channel.LocalChannel) =>
									desktopChannel.connect(mobileChannel)
							);
						}
					);

					this.desktop	= new Cyph.UI.Chat.Chat(
						dialogManager,
						() => ({close: () => {}, open: () => {}}),
						{notify: (message: string) => {}},
						false,
						false,
						desktopSession,
						Elements.demoRootDesktop()
					);

					this.mobile		= new Cyph.UI.Chat.Chat(
						dialogManager,
						this.mobileMenu,
						{notify: (message: string) => {}},
						false,
						true,
						mobileSession,
						Elements.demoRootMobile()
					);

					await Cyph.Util.sleep(750);

					let totalDelay: number	= 7500;

					CyphDemo.messages.forEach(async (message) => {
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
								}, totalDelay);

								totalDelay += Cyph.Util.random(50, 10);
							});
						}

						totalDelay += Cyph.Util.random(maxDelay, minDelay);

						await Cyph.Util.sleep(totalDelay);

						chat.currentMessage	= '';
						chat.send(text);

						if (!Cyph.Env.isMobile && text === CyphDemo.facebookPicMessage) {
							const innerTimeout: number	= 250;
							const outerTimeout: number	= 250;

							totalDelay += (innerTimeout + outerTimeout) * 1.5;

							await Cyph.Util.sleep(outerTimeout);

							Elements.demoRoot().find(
								'.message-text > p > a > img:visible[src="' +
									CyphDemo.facebookPicUrl +
								'"]'
							).each(async (i: number, elem: HTMLElement) => {
								const $this: JQuery			= $(elem);

								const isDesktop: boolean	=
									$this.
										parentsUntil().
										index(Elements.demoListDesktop()[0])
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

								await Cyph.Util.sleep(innerTimeout);

								const offset	= CyphDemo.getOffset(
									$placeholder,
									isDesktop ?
										Elements.demoListDesktop() :
										Elements.demoListMobile()
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
							});
						}
					});

					totalDelay += 1000;
					await Cyph.Util.sleep(totalDelay);

					this.desktop.currentMessage	= '';
					this.mobile.currentMessage	= '';
				});
			});
		})();
	}
}
