import {Elements} from './elements';
import {IDialogManager} from './idialogmanager';
import {ILinkConnection} from './ilinkconnection';
import {IChat} from './chat/ichat';
import {Env} from '../env';
import {Timer} from '../timer';
import {ITimer} from '../itimer';
import {Strings} from '../strings';
import {Util} from '../util';
import {Events} from '../session/enums';
import * as Chat from './chat';


export class LinkConnection implements ILinkConnection {
	private isCopying: boolean;
	private isWaiting: boolean;
	private linkConstant: string;

	public isPassive: boolean;
	public link: string;
	public linkEncoded: string;
	public timer: ITimer;

	public advancedFeatures: boolean;

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
			/* Only allow right-clicking (for copying the link) */
			Elements.connectLinkLink().click(e => e.preventDefault());
		}
		else {
			const linkInterval	= setInterval(() => {
				if (!this.isWaiting) {
					clearInterval(linkInterval);
					return;
				}
				else if (this.advancedFeatures) {
					return;
				}

				this.link	= this.linkConstant;
				Elements.connectLinkInput().focus();
				this.selectLink();
			}, 1000);
		}

		Elements.body().one('click', () =>
			this.copyToClipboard().catch(() => {})
		);

		this.chat.session.on(Events.connect, () => this.timer.stop());
		await this.timer.start();

		if (this.isWaiting) {
			this.chat.abortSetup();
		}
	}

	public async copyToClipboard () : Promise<void> {
		if (this.isCopying) {
			return;
		}

		this.isCopying	= true;

		try {
			await clipboard.copy(this.linkConstant);
			await this.dialogManager.toast({content: Strings.linkCopied, delay: 2500});
		}
		finally {
			this.isCopying	= false;
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
	 * @param dialogManager
	 */
	public constructor (
		countdown: number,
		private chat: IChat,
		private dialogManager: IDialogManager
	) {
		this.timer	= new Timer(countdown);
	}
}
