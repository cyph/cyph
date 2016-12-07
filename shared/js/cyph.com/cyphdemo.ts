import * as Cyph from '../cyph';
import {Elements} from './elements';


/**
 * Controls the Cyph chat demo.
 */
export class CyphDemo extends Cyph.UI.BaseButtonManager {
	/** @ignore */
	private static readonly demoClass: string	= 'demo';

	/** @ignore */
	private static readonly facebookPicUrl: Promise<string>		= Cyph.Util.request({
		url: Cyph.Env.isMobile ?
			'/img/fbimagealt.txt' :
			'/img/null.txt'
	});

	/** @ignore */
	private static readonly facebookPicMessage: Promise<string>	= (async () =>
		`![](${await CyphDemo.facebookPicUrl})\n\n#### mynewpic.jpg`
	)();

	/** @ignore */
	private static facebookPicFrame: string			= Cyph.Env.isMobile ? '' : `
		<div class='facebook-pic image-frame real'>
			<iframe
				src='https://www.facebook.com/plugins/comments.php?href=https://www.${
					Cyph.Util.generateGuid(Cyph.Util.random(20, 5))
				}.com&width=1000'
			></iframe>
		</div>
	`;

	/** @ignore */
	private static readonly facebookPicPlaceholder: string	= `
		<div class='facebook-pic image-frame'>&nbsp;</div>
	`;

	/** @ignore */
	private static readonly mobileUIScale: number	= 0.625;

	/** @ignore */
	private static readonly messages: Promise<{text: string; isMobile: boolean}[]>	= (async () => [
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
		{
			isMobile: false,
			text: `anyway, you think this pic is appropriate for LinkedIn?`
		},
		{
			isMobile: false,
			text: await CyphDemo.facebookPicMessage
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
	])();

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
	private async resize (forceActive?: boolean) : Promise<void> {
		const isActive: boolean	= forceActive || (
			!Elements.heroText().is(':appeared') &&
			Elements.demoRoot().is(':appeared')
		);

		if (this.isActive !== isActive) {
			if (!(<HTMLVideoElement> Elements.backgroundVideo()[0]).paused) {
				setTimeout(
					() => {
						try {
							if (Elements.backgroundVideo().is(':appeared')) {
								try {
									(<HTMLVideoElement> Elements.backgroundVideo()[0]).play();
								}
								catch (_) {}
							}
						}
						catch (_) {}
					},
					2000
				);
			}

			try {
				(<HTMLVideoElement> Elements.backgroundVideo()[0]).pause();
			}
			catch (_) {}
		}

		this.isActive	= isActive;

		await Cyph.Util.sleep();

		if (Cyph.Env.isMobile) {
			return;
		}

		if (this.isActive) {
			this.resizeDesktop();
			await Cyph.Util.sleep(500);
			this.resizeMobile();
			return;
		}

		await Elements.screenshotLaptop().
			add(Elements.screenshotPhone()).
			toArray().
			reduce(
				async (p: Promise<void>, elem: HTMLElement) => {
					await p;

					const $this: JQuery	= $(elem);

					$this.css({
						'margin-left': '',
						'margin-top': '',
						'width': ''
					});

					await Cyph.Util.sleep(500);
					$this.removeClass(CyphDemo.demoClass);
					await Cyph.Util.sleep(500);
				},
				Promise.resolve()
			)
		;
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

			(<any> Elements.demoRoot()).appear();
			(<any> Elements.heroText()).appear();

			await Cyph.Util.sleep(1000);
			while (Elements.heroText().is(':appeared')) {
				await Cyph.Util.sleep();
			}

			await new Promise(resolve => Elements.demoRoot().one('appear', resolve));
			await Cyph.Util.sleep(750);
			await this.resize(true);

			Elements.demoRoot().css('opacity', 1);

			setInterval(async () => this.resize(), 2000);

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

			const $desktopFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);
			const $mobileFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);

			if (!Cyph.Env.isMobile) {
				while (
					Elements.demoListDesktop().length < 1 ||
					Elements.demoListMobile().length < 1
				) {
					await Cyph.Util.sleep();
				}

				Elements.demoListDesktop().append($desktopFacebookPic);
				Elements.demoListMobile().append($mobileFacebookPic);
			}

			await Cyph.Util.sleep(7500);

			const messages				= await CyphDemo.messages;
			const facebookPicUrl		= await CyphDemo.facebookPicUrl;
			const facebookPicMessage	= await CyphDemo.facebookPicMessage;

			for (let message of messages) {
				const chat: Cyph.UI.Chat.IChat	=
					message.isMobile ?
						this.mobile :
						this.desktop
				;

				const text		= Cyph.Util.translate(message.text);
				const maxDelay	= text.length > 15 ? 500 : 250;
				const minDelay	= 125;

				await Cyph.Util.sleep(Cyph.Util.random(maxDelay, minDelay));

				if (text !== facebookPicMessage) {
					for (let c of text.split('')) {
						chat.currentMessage += c;
						await Cyph.Util.sleep(Cyph.Util.random(50, 10));
					}
				}

				await Cyph.Util.sleep(Cyph.Util.random(maxDelay, minDelay));

				chat.currentMessage	= '';
				chat.send(text);

				if (Cyph.Env.isMobile || text !== facebookPicMessage) {
					continue;
				}

				let $facebookPicImg: JQuery;
				while (!$facebookPicImg || $facebookPicImg.length < 2) {
					$facebookPicImg	= Elements.demoRoot().find(
						`img:visible[src='${facebookPicUrl}']`
					);
					await Cyph.Util.sleep();
				}

				$facebookPicImg.each(async (i: number, elem: HTMLElement) => {
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

					await Cyph.Util.sleep();

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

				await Cyph.Util.sleep();
			}

			await Cyph.Util.sleep(1000);

			this.desktop.currentMessage	= '';
			this.mobile.currentMessage	= '';
		})();
	}
}
