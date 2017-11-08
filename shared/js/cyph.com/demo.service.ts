import {Injectable} from '@angular/core';
import {EnvService} from '../cyph/services/env.service';
import {random} from '../cyph/util/random';
import {request} from '../cyph/util/request';
import {translate} from '../cyph/util/translate';
import {readableID} from '../cyph/util/uuid';
import {sleep} from '../cyph/util/wait';
import {ChatData} from './chat-data';


/**
 * Angular service for Cyph chat demo.
 */
@Injectable()
export class DemoService {
	/** Desktop chat UI data. */
	public desktop: ChatData;

	/** Data URI to use for placeholder for Facebook joke. */
	public readonly facebookPicDataUri: Promise<string>		= (
		!this.envService.isMobile ?
			Promise.reject('') :
			request({retries: 5, url: '/assets/img/fbimagealt.txt'})
	).catch(
		() => 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs='
	);

	/** Frame containing Facebook profile picture. */
	public readonly facebookPicFrame: string			= this.envService.isMobile ? '' : `
		<div class='facebook-pic image-frame real'>
			<iframe
				src='https://www.facebook.com/plugins/comments.php?href=https://www.${
					readableID(random(20, 5))
				}.com&width=1000'
			></iframe>
		</div>
	`;

	/** Complete message to use as placeholder for Facebook joke. */
	public readonly facebookPicMessage: Promise<string>	= (async () =>
		`![](${await this.facebookPicDataUri})\n\n#### mynewpic.jpg`
	)();

	/** Placeholder div for absolutely positioned iframe to sit on top of. */
	public readonly facebookPicPlaceholder: string		= `
		<div class='facebook-pic image-frame'>&nbsp;</div>
	`;

	/** Indicates whether demo is in active state. */
	public isActive: boolean	= false;

	/** Messages to send during demo. */
	public readonly messages: Promise<{
		isMobile: boolean;
		text: string;
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

	/** Mobile chat UI data. */
	public mobile: ChatData;

	/** Runs the demo. */
	public async run (facebookJoke: () => void) : Promise<void> {
		this.desktop.resolveStart();
		this.mobile.resolveStart();
		await sleep(2500);

		const messages				= await this.messages;
		const facebookPicMessage	= await this.facebookPicMessage;

		for (const message of messages) {
			const chatData	= message.isMobile ? this.mobile : this.desktop;
			const other		= message.isMobile ? this.desktop : this.mobile;
			const text		= translate(message.text);
			const maxDelay	= text.length > 15 ? 500 : 250;
			const minDelay	= 125;

			await sleep(random(maxDelay, minDelay));

			if (text === facebookPicMessage) {
				chatData.message.next(text);
				other.scrollDown.next();

				if (!this.envService.isMobile) {
					facebookJoke();
					await sleep();
				}
			}
			else {
				for (const c of text.split('')) {
					chatData.message.next(c);
					await sleep(random(50, 10));
				}

				await sleep(random(maxDelay, minDelay));

				chatData.message.next('');
				other.scrollDown.next();
			}
		}
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		this.desktop	= new ChatData(false);
		this.mobile		= new ChatData(
			true,
			this.desktop.channelOutgoing,
			this.desktop.channelIncoming
		);
	}
}
