import {Injectable} from '@angular/core';
import {LocalChannel} from '../cyph/channel/local-channel';
import {env} from '../cyph/env';
import {Session} from '../cyph/session/session';
import {urlState} from '../cyph/url-state';
import {util} from '../cyph/util';
import {ChatData} from './chat-data';
import {HomeSections} from './enums';


/**
 * Angular service for Cyph chat demo.
 */
@Injectable()
export class DemoService {
	/** Indicates whether demo is in active state. */
	public isActive: boolean	= false;

	/** Data URI to use for placeholder for Facebook joke. */
	public readonly facebookPicUrl: Promise<string>		= util.request({
		url: env.isMobile ?
			'/img/fbimagealt.txt' :
			'/img/null.txt'
	});

	/** Complete message to use as placeholder for Facebook joke. */
	public readonly facebookPicMessage: Promise<string>	= (async () =>
		`![](${await this.facebookPicUrl})\n\n#### mynewpic.jpg`
	)();

	/** Frame containing Facebook profile picture. */
	public readonly facebookPicFrame: string			= env.isMobile ? '' : `
		<div class='facebook-pic image-frame real'>
			<iframe
				src='https://www.facebook.com/plugins/comments.php?href=https://www.${
					util.generateGuid(util.random(20, 5))
				}.com&width=1000'
			></iframe>
		</div>
	`;

	/** Placeholder div for absolutely positioned iframe to sit on top of. */
	public readonly facebookPicPlaceholder: string		= `
		<div class='facebook-pic image-frame'>&nbsp;</div>
	`;

	/** Messages to send during demo. */
	public readonly messages: Promise<{
		text: string;
		isMobile: boolean;
	}[]>	= (async () => [
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
			text: await this.facebookPicMessage
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

	/** Desktop chat UI data. */
	public desktop: ChatData;

	/** Mobile chat UI data. */
	public mobile: ChatData;

	/** Run the demo. */
	public async run (facebookJoke: () => void) : Promise<void> {
		this.desktop.resolveStart();
		this.mobile.resolveStart();
		await util.sleep(2500);

		const messages				= await this.messages;
		const facebookPicMessage	= await this.facebookPicMessage;

		for (const message of messages) {
			const chatData	= message.isMobile ? this.mobile : this.desktop;
			const other		= message.isMobile ? this.desktop : this.mobile;
			const text		= util.translate(message.text);
			const maxDelay	= text.length > 15 ? 500 : 250;
			const minDelay	= 125;

			await util.sleep(util.random(maxDelay, minDelay));

			if (text === facebookPicMessage) {
				chatData.message.next(text);
				other.scrollDown.next();

				if (!env.isMobile) {
					facebookJoke();
					await util.sleep();
				}
			}
			else {
				for (const c of text.split('')) {
					chatData.message.next(c);
					await util.sleep(util.random(50, 10));
				}

				await util.sleep(util.random(maxDelay, minDelay));

				chatData.message.next('');
				other.scrollDown.next();
			}
		}
	}

	constructor () {
		this.desktop	= new ChatData(false, new Session(
			undefined,
			false,
			undefined,
			(desktopChannel: LocalChannel) => {
				this.mobile	= new ChatData(true, new Session(
					undefined,
					false,
					undefined,
					(mobileChannel: LocalChannel) => {
						desktopChannel.connect(mobileChannel);
					}
				));
			}
		));

		/* Cyphertext easter egg */
		/* tslint:disable-next-line:no-unused-new */
		new (<any> self).Konami(async () => {
			urlState.setUrl(HomeSections[HomeSections.intro]);

			while (!this.isActive) {
				await util.sleep();
			}

			if (env.isMobile) {
				this.mobile.showCyphertext.next();
			}
			else {
				this.desktop.showCyphertext.next();
				await util.sleep(8000);
				this.mobile.showCyphertext.next();
			}
		});
	}
}
