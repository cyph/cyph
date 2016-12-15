import {LocalChannel} from '../cyph/channel/localchannel';
import {env} from '../cyph/env';
import {ISession} from '../cyph/session/isession';
import {Session} from '../cyph/session/session';
import {Chat} from '../cyph/ui/chat/chat';
import {IChat} from '../cyph/ui/chat/ichat';
import * as CyphElements from '../cyph/ui/elements';
import {IDialogManager} from '../cyph/ui/idialogmanager';
import {util} from '../cyph/util';
import {elements} from './elements';


/**
 * Controls the Cyph chat demo.
 */
export class CyphDemo {
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
			top: Math.floor(elemOffset.top - ancestorOffset.top) - 5
		};
	}


	/** @ignore */
	private isActive: boolean;

	/** Desktop chat UI. */
	public desktop: IChat;

	/** Mobile chat UI. */
	public mobile: IChat;

	/** @ignore */
	private async activeTransition (forceActiveState?: boolean) : Promise<void> {
		const isActive: boolean	=
			forceActiveState !== undefined ?
				forceActiveState :
				(!elements.heroText().is(':appeared') && elements.demoRoot().is(':appeared'))
		;

		if (this.isActive === isActive) {
			return;
		}

		this.isActive	= isActive;

		if (this.isActive) {
			for (const o of [
				{
					$root: elements.demoRootDesktop(),
					$screenshot: elements.screenshotLaptop(),
					multiplierHeight: 0.104,
					multiplierWidth: 0.130,
					scale: 0.73,
					verticalOffset: 0
				},
				{
					$root: elements.demoRootMobile(),
					$screenshot: elements.screenshotPhone(),
					multiplierHeight: 0.098,
					multiplierWidth: 0.081,
					scale: 0.5,
					verticalOffset: 100
				}
			]) {
				const rootOffset	= o.$root.offset();
				const offset		= o.$screenshot.offset();
				const width			= o.$screenshot.width();
				const height		= o.$screenshot.height();

				o.$screenshot.addClass(CyphDemo.demoClass).css(
					'transform',
					`scale(${1 / o.scale}) ` +
					`translateX(${Math.ceil(
						(rootOffset.left * o.scale) -
						(offset.left * o.scale) -
						(width * o.multiplierWidth) +
						1
					)}px) ` +
					`translateY(${Math.ceil(
						(rootOffset.top * o.scale) -
						(offset.top * o.scale) -
						(height * o.multiplierHeight) +
						(o.verticalOffset * o.scale) +
						1
					)}px)`
				);
			}
		}
		else {
			const $screenshots	= elements.screenshotLaptop().add(elements.screenshotPhone());
			$screenshots.removeAttr('style');
			await util.sleep();
			$screenshots.removeClass(CyphDemo.demoClass);
			await util.sleep();
		}
	}

	constructor (dialogManager: IDialogManager) { (async () => {
		await CyphElements.Elements.waitForElement(elements.demoRoot);
		await CyphElements.Elements.waitForElement(elements.heroText);

		if (!env.isMobile) {
			await CyphElements.Elements.waitForElement(() =>
				elements.screenshotLaptop().filter((i: number, elem: HTMLElement) =>
					$(elem).offset().left > 0
				)
			);
			await CyphElements.Elements.waitForElement(() =>
				elements.screenshotPhone().filter((i: number, elem: HTMLElement) =>
					$(elem).offset().left < CyphElements.elements.window().width()
				)
			);
		}

		(<any> elements.demoRoot()).appear();
		(<any> elements.heroText()).appear();

		if (!elements.demoRoot().is(':appeared')) {
			await new Promise<void>(resolve => elements.demoRoot().one('appear', () => resolve()));
		}

		if (elements.heroText().is(':appeared')) {
			await new Promise<void>(resolve => elements.heroText().one('disappear', () => resolve()));
		}

		await util.sleep(750);

		if (!env.isMobile) {
			await this.activeTransition(true);
		}

		elements.demoRoot().css('opacity', 1);

		if (!env.isMobile) {
			elements.heroText().on('appear', async () => this.activeTransition());
			elements.heroText().on('disappear', async () => this.activeTransition());
			elements.demoRoot().on('appear', async () => this.activeTransition());
			elements.demoRoot().on('disappear', async () => this.activeTransition());

			let previousWidth	= CyphElements.elements.window().width();
			CyphElements.elements.window().resize(async () => {
				const width	= CyphElements.elements.window().width();
				if (width === previousWidth) {
					return;
				}
				previousWidth	= width;
				this.activeTransition(false);
				await util.sleep(1000);
				this.activeTransition();
			});
		}

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
			{notify: (message: string) => {}},
			false,
			false,
			desktopSession,
			elements.demoRootDesktop()
		);

		this.mobile		= new Chat(
			dialogManager,
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

		await util.sleep(2500);

		const messages				= await CyphDemo.messages;
		const facebookPicUrl		= await CyphDemo.facebookPicUrl;
		const facebookPicMessage	= await CyphDemo.facebookPicMessage;

		for (const message of messages) {
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
				for (const c of text.split('')) {
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
					$this.parentsUntil().index(elements.demoListDesktop()[0]) > -1
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
	})(); }
}
