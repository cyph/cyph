import {Elements} from './elements';
import {ILinkConnection} from './ilinkconnection';
import {IChat} from './chat/ichat';
import {Env} from '../env';
import {Timer} from '../timer';
import {ITimer} from '../itimer';
import {Strings} from '../strings';
import {Util} from '../util';
import {Events} from '../session/enums';


export class LinkConnection implements ILinkConnection {
	private isWaiting: boolean;
	private linkConstant: string;

	public isPassive: boolean;
	public link: string;
	public linkEncoded: string;
	public timer: ITimer;

	private selectLink () : void {
		Util.getValue(
			Elements.connectLinkInput()[0],
			'setSelectionRange',
			() => {}
		).call(
			Elements.connectLinkInput()[0],
			0,
			this.linkConstant.length
		);
	}

	private setLink () : void {
		if (this.link !== this.linkConstant) {
			this.link	= this.linkConstant;
		}
	}

	public async beginWaiting (
		baseUrl: string,
		secret: string,
		isPassive: boolean
	) : Promise<void> {
		this.isWaiting		= true;
		this.linkConstant	= baseUrl + (baseUrl.indexOf('#') > -1 ? '' : '#') + secret;
		this.linkEncoded	= encodeURIComponent(this.linkConstant);
		this.link			= this.linkConstant;
		this.isPassive		= isPassive;

		if (Env.isMobile) {
			this.setLink();

			/* Only allow right-clicking (for copying the link) */
			Elements.connectLinkLink().click(e => e.preventDefault());
		}
		else {
			const linkInterval	= setInterval(() => {
				if (this.isWaiting) {
					this.setLink();
					Elements.connectLinkInput().focus();
					this.selectLink();
				}
				else {
					clearInterval(linkInterval);
				}
			}, 250);
		}

		this.chat.session.on(Events.connect, () => this.timer.stop());
		await this.timer.start();

		if (this.isWaiting) {
			this.chat.abortSetup();
		}
	}

	public stop () : void {
		this.isWaiting		= false;
		this.linkConstant	= '';
		this.link			= '';
		this.linkEncoded	= '';

		/* Stop mobile browsers from keeping this selected */
		Elements.connectLinkInput().blur();
	}

	/**
	 * @param countdown
	 * @param chat
	 */
	public constructor (
		countdown: number,
		private chat: IChat
	) {
		this.timer	= new Timer(countdown);
	}
}
