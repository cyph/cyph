import {Env} from '../env';
import {ITimer} from '../itimer';
import {Events} from '../session/enums';
import {Strings} from '../strings';
import {Timer} from '../timer';
import {Util} from '../util';
import {IChat} from './chat/ichat';
import {Elements} from './elements';
import {IDialogManager} from './idialogmanager';
import {ILinkConnection} from './ilinkconnection';


/** @inheritDoc */
export class LinkConnection implements ILinkConnection {
	/** @ignore */
	private isCopying: boolean;

	/** @ignore */
	private isWaiting: boolean;

	/** @ignore */
	private linkConstant: string;

	/** @inheritDoc */
	public advancedFeatures: boolean;

	/** @inheritDoc */
	public isPassive: boolean;

	/** @inheritDoc */
	public link: string;

	/** @inheritDoc */
	public linkEncoded: string;

	/** @inheritDoc */
	public timer: ITimer;

	/** @ignore */
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

	/** @inheritDoc */
	public addTime (milliseconds: number) : void {
		this.timer.addTime(milliseconds);
		this.dialogManager.toast({
			content: Strings.timeExtended,
			delay: 2500
		});
	}

	/** @inheritDoc */
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
			const linkInterval	= setInterval(
				() => {
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
				},
				1000
			);
		}

		Elements.body().one('click', async () =>
			this.copyToClipboard().catch(() => {})
		);

		this.chat.session.on(Events.connect, () => this.timer.stop());
		await this.timer.start();

		if (this.isWaiting) {
			this.chat.abortSetup();
		}
	}

	/** @inheritDoc */
	public async copyToClipboard () : Promise<void> {
		if (this.isCopying) {
			return;
		}

		this.isCopying	= true;

		try {
			await clipboard.copy(this.linkConstant);
			await this.dialogManager.toast({
				content: Strings.linkCopied,
				delay: 2500
			});
		}
		finally {
			this.isCopying	= false;
		}
	}

	/** @inheritDoc */
	public stop () : void {
		this.isWaiting		= false;
		this.linkConstant	= '';
		this.link			= '';
		this.linkEncoded	= '';

		/* Stop mobile browsers from keeping this selected */
		Elements.connectLinkInput().blur();
	}

	constructor (
		countdown: number,

		/** @ignore */
		private chat: IChat,

		/** @ignore */
		private dialogManager: IDialogManager
	) {
		this.timer	= new Timer(countdown);
	}
}
