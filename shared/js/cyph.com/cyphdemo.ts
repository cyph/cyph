import {LocalChannel} from '../cyph/channel/localchannel';
import {env} from '../cyph/env';
import {ISession} from '../cyph/session/isession';
import {Session} from '../cyph/session/session';
import {BaseButtonManager} from '../cyph/ui/basebuttonmanager';
import {Chat} from '../cyph/ui/chat/chat';
import {IChat} from '../cyph/ui/chat/ichat';
import * as CyphElements from '../cyph/ui/elements';
import {IDialogManager} from '../cyph/ui/idialogmanager';
import {util} from '../cyph/util';
import {elements} from './elements';


/**
 * Controls the Cyph chat demo.
 */
export class CyphDemo extends BaseButtonManager {
	/** @ignore */
	private static readonly demoClass: string	= 'demo';

	/** @ignore */
	private static readonly facebookPicUrl: Promise<string>		= util.request({
		url: env.isMobile ?
			'/img/fbimagealt.txt' :
			'/img/null.txt'
	});

	/** @ignore */
	private static readonly facebookPicMessage: Promise<string>	= (async () =>
		`![](${await CyphDemo.facebookPicUrl})\n\n#### mynewpic.jpg`
	)();

	/** @ignore */
	private static facebookPicFrame: string			= env.isMobile ? '' : `
		<div class='facebook-pic image-frame real'>
			<iframe
				src='https://www.facebook.com/plugins/comments.php?href=https://www.${
					util.generateGuid(util.random(20, 5))
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
	public desktop: IChat;

	/** Mobile chat UI. */
	public mobile: IChat;

	/** @ignore */
	private async resize (forceActive?: boolean) : Promise<void> {
		const isActive: boolean	= forceActive || (
			!elements.heroText().is(':appeared') &&
			elements.demoRoot().is(':appeared')
		);

		if (this.isActive !== isActive) {
			if (!(<HTMLVideoElement> elements.backgroundVideo()[0]).paused) {
				(async () => {
					await util.sleep(2000);

					try {
						if (elements.backgroundVideo().is(':appeared')) {
							try {
								(<HTMLVideoElement> elements.backgroundVideo()[0]).play();
							}
							catch (_) {}
						}
					}
					catch (_) {}
				})();
			}

			try {
				(<HTMLVideoElement> elements.backgroundVideo()[0]).pause();
			}
			catch (_) {}
		}

		this.isActive	= isActive;

		await util.sleep();

		if (env.isMobile) {
			return;
		}

		if (this.isActive) {
			this.resizeDesktop();
			await util.sleep(500);
			this.resizeMobile();
			return;
		}

		await elements.screenshotLaptop().
			add(elements.screenshotPhone()).
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

					await util.sleep(500);
					$this.removeClass(CyphDemo.demoClass);
					await util.sleep(500);
				},
				Promise.resolve()
			)
		;
	}

	/** @ignore */
	private resizeDesktop () : void {
		const width: number		= Math.floor(
			(CyphElements.elements.window().width() - 70) * 0.47 / 0.75
		);

		const height: number	= width * 0.563;

		elements.screenshotLaptop().addClass(CyphDemo.demoClass).css({
			width,
			'margin-left': Math.ceil(
				elements.demoRootDesktop().offset().left -
				elements.screenshotLaptop().offset().left -
				width * 0.13 +
				parseFloat(elements.screenshotLaptop().css('margin-left'))
			),
			'margin-top': Math.ceil(
				elements.demoRootDesktop().offset().top -
				elements.screenshotLaptop().offset().top -
				height * 0.104 +
				parseFloat(elements.screenshotLaptop().css('margin-top'))
			)
		});
	}

	/** @ignore */
	private resizeMobile () : void {
		const width: number		= Math.floor(
			(CyphElements.elements.window().width() - 70) * 0.26 / 1.404
		);

		const height: number	= width * 2.033;

		elements.screenshotPhone().addClass(CyphDemo.demoClass).css({
			width,
			'margin-left': Math.ceil(
				elements.demoRootMobile().offset().left -
				elements.screenshotPhone().offset().left -
				width * 0.073 +
				parseFloat(elements.screenshotPhone().css('margin-left'))
			),
			'margin-top': Math.ceil(
				elements.demoRootMobile().offset().top -
				elements.screenshotPhone().offset().top -
				height * 0.098 +
				parseFloat(elements.screenshotPhone().css('margin-top'))
			)
		});
	}

	constructor (dialogManager: IDialogManager) {
		super();

		(async () => {
			await CyphElements.Elements.waitForElement(elements.demoRoot);
			await CyphElements.Elements.waitForElement(elements.heroText);

			await util.sleep(1000);

			if (elements.heroText().is(':appeared')) {
				(<any> elements.heroText()).appear();
				await new Promise(resolve => elements.heroText().one('disappear', resolve));
			}

			if (!elements.demoRoot().is(':appeared')) {
				(<any> elements.demoRoot()).appear();
				await new Promise(resolve => elements.demoRoot().one('appear', resolve));
			}

			await util.sleep(750);
			await this.resize(true);

			elements.demoRoot().css('opacity', 1);

			/* Temporary workaround pending TypeScript fix. */
			/* tslint:disable-next-line:ban  */
			setTimeout(async () => {
				while (true) {
					await util.sleep(2000);
					this.resize();
				}
			});

			let mobileSession: ISession;
			const desktopSession: ISession	= new Session(
				null,
				false,
				undefined,
				(desktopChannel: LocalChannel) => {
					mobileSession	= new Session(
						null,
						false,
						undefined,
						(mobileChannel: LocalChannel) =>
							desktopChannel.connect(mobileChannel)
					);
				}
			);

			this.desktop	= new Chat(
				dialogManager,
				() => ({close: () => {}, open: () => {}}),
				{notify: (message: string) => {}},
				false,
				false,
				desktopSession,
				elements.demoRootDesktop()
			);

			this.mobile		= new Chat(
				dialogManager,
				this.mobileMenu,
				{notify: (message: string) => {}},
				false,
				true,
				mobileSession,
				elements.demoRootMobile()
			);

			const $desktopFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);
			const $mobileFacebookPic: JQuery	= $(CyphDemo.facebookPicFrame);

			if (!env.isMobile) {
				await CyphElements.Elements.waitForElement(elements.demoListDesktop);
				await CyphElements.Elements.waitForElement(elements.demoListMobile);
				elements.demoListDesktop().append($desktopFacebookPic);
				elements.demoListMobile().append($mobileFacebookPic);
			}

			await util.sleep(7500);

			const messages				= await CyphDemo.messages;
			const facebookPicUrl		= await CyphDemo.facebookPicUrl;
			const facebookPicMessage	= await CyphDemo.facebookPicMessage;

			for (let message of messages) {
				const chat: IChat		=
					message.isMobile ?
						this.mobile :
						this.desktop
				;

				const otherChat: IChat	=
					message.isMobile ?
						this.desktop :
						this.mobile
				;

				const text		= util.translate(message.text);
				const maxDelay	= text.length > 15 ? 500 : 250;
				const minDelay	= 125;

				await util.sleep(util.random(maxDelay, minDelay));

				if (text !== facebookPicMessage) {
					for (let c of text.split('')) {
						chat.currentMessage += c;
						await util.sleep(util.random(50, 10));
					}
				}

				await util.sleep(util.random(maxDelay, minDelay));

				chat.currentMessage	= '';
				chat.send(text);
				otherChat.scrollManager.scrollDown();

				if (env.isMobile || text !== facebookPicMessage) {
					continue;
				}

				const $facebookPicImg	= await CyphElements.Elements.waitForElement(
					() => elements.demoRoot().find(`img:visible[src='${facebookPicUrl}']`),
					2
				);

				$facebookPicImg.each(async (i: number, elem: HTMLElement) => {
					const $this: JQuery			= $(elem);

					const isDesktop: boolean	=
						$this.
							parentsUntil().
							index(elements.demoListDesktop()[0])
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

					await util.sleep();

					const offset	= CyphDemo.getOffset(
						$placeholder,
						isDesktop ?
							elements.demoListDesktop() :
							elements.demoListMobile()
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

				await util.sleep();
			}

			await util.sleep(1000);

			this.desktop.currentMessage	= '';
			this.mobile.currentMessage	= '';
		})();
	}
}
