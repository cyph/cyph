import {Elements} from './elements';
import {ILinkConnection} from './ilinkconnection';
import {IChat} from './chat/ichat';
import {Env} from '../env';
import {IController} from '../icontroller';
import {Strings} from '../strings';
import {Util} from '../util';


export class LinkConnection implements ILinkConnection {
	private isWaiting: boolean;
	private linkConstant: string;

	public isPassive: boolean;
	public link: string;
	public linkEncoded: string;

	private selectLink () : void {
		Util.getValue(
			Elements.connectLinkInput[0],
			'setSelectionRange',
			() => {}
		).call(
			Elements.connectLinkInput[0],
			0,
			this.linkConstant.length
		);
	}

	private setLink () : void {
		if (this.link !== this.linkConstant) {
			this.link	= this.linkConstant;
			this.controller.update();
		}
	}

	public beginWaiting (baseUrl: string, secret: string, isPassive: boolean) : void {
		this.isWaiting		= true;
		this.linkConstant	= baseUrl + (baseUrl.indexOf('#') > -1 ? '' : '#') + secret;
		this.linkEncoded	= encodeURIComponent(this.linkConstant);
		this.link			= this.linkConstant;
		this.isPassive		= isPassive;

		if (Env.isMobile) {
			this.setLink();

			/* Only allow right-clicking (for copying the link) */
			Elements.connectLinkLink.click(e => e.preventDefault());
		}
		else {
			const linkInterval	= setInterval(() => {
				if (this.isWaiting) {
					this.setLink();
					Elements.connectLinkInput.focus();
					this.selectLink();
				}
				else {
					clearInterval(linkInterval);
				}
			}, 250);
		}

		if (Env.isIE) {
			const expireTime: string	= new Date(Util.timestamp() + this.countdown * 1000)
				.toLocaleTimeString()
				.toLowerCase()
				.replace(/(.*:.*):.*? /, '$1')
			;

			Elements.timer.parent().text(Strings.linkExpiresAt + ' ' + expireTime);
		}
		else {
			Elements.timer[0]['start']();
		}

		setTimeout(
			() => {
				if (this.isWaiting) {
					this.chat.abortSetup();
				}
			},
			this.countdown * 1000
		);
	}

	public stop () : void {
		this.isWaiting		= false;
		this.linkConstant	= '';
		this.link			= '';
		this.linkEncoded	= '';

		/* Stop mobile browsers from keeping this selected */
		Elements.connectLinkInput.blur();
	}

	/**
	 * @param countdown
	 * @param controller
	 * @param chat
	 */
	public constructor (
		public countdown: number,
		private controller: IController,
		private chat: IChat
	) {}
}
