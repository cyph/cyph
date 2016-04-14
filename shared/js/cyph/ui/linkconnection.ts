import {Elements} from 'elements';
import {ILinkConnection} from 'ilinkconnection';
import {Env} from 'cyph/env';
import {IController} from 'cyph/icontroller';
import {Util} from 'cyph/util';


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
		this.linkConstant	= baseUrl + '#' + secret;
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
			const expireTime: string	= new Date(Date.now() + this.countdown * 1000)
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
					this.abort();
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
	 * @param abort
	 */
	public constructor (
		public countdown: number,
		private controller: IController,
		private abort: Function
	) {}
}
