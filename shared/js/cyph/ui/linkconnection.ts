import {env} from '../env';
import {ITimer} from '../itimer';
import {events} from '../session/enums';
import {strings} from '../strings';
import {Timer} from '../timer';
import {util} from '../util';
import {IChat} from './chat/ichat';
import {elements} from './elements';
import {IDialogManager} from './idialogmanager';
import {ILinkConnection} from './ilinkconnection';


/** @inheritDoc */
export class LinkConnection implements ILinkConnection {
	/** @ignore */
	private isWaiting: boolean;

	/** @ignore */
	private linkConstant: string;

	/** @ignore */
	private readonly addTimeLock: {}	= {};

	/** @ignore */
	private readonly copyLock: {}		= {};

	/** @inheritDoc */
	public readonly advancedFeatures: boolean;

	/** @inheritDoc */
	public isPassive: boolean;

	/** @inheritDoc */
	public link: string;

	/** @inheritDoc */
	public linkEncoded: string;

	/** @inheritDoc */
	public readonly timer: ITimer;

	/** @ignore */
	private selectLink () : void {
		util.getValue(
			elements.connectLinkInput()[0],
			'setSelectionRange',
			() => {}
		).call(
			elements.connectLinkInput()[0],
			0,
			this.linkConstant.length
		);
	}

	/** @inheritDoc */
	public async addTime (milliseconds: number) : Promise<void> {
		this.timer.addTime(milliseconds);

		return util.lock(
			this.addTimeLock,
			async () => {
				await this.dialogManager.toast({
					content: strings.timeExtended,
					delay: 2500
				});
			},
			true,
			true
		);
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

		if (env.isMobile) {
			/* Only allow right-clicking (for copying the link) */
			elements.connectLinkLink().click(e => e.preventDefault());
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
					elements.connectLinkInput().focus();
					this.selectLink();
				},
				1000
			);
		}

		this.chat.session.on(events.connect, () => this.timer.stop());
		await this.timer.start();

		if (this.isWaiting) {
			this.chat.abortSetup();
		}
	}

	/** @inheritDoc */
	public async copyToClipboard () : Promise<void> {
		return util.lock(
			this.copyLock,
			async () => {
				await clipboard.copy(this.linkConstant);
				await this.dialogManager.toast({
					content: strings.linkCopied,
					delay: 2500
				});
			},
			true,
			true
		);
	}

	/** @inheritDoc */
	public stop () : void {
		this.isWaiting		= false;
		this.linkConstant	= '';
		this.link			= '';
		this.linkEncoded	= '';

		/* Stop mobile browsers from keeping this selected */
		elements.connectLinkInput().blur();
	}

	constructor (
		countdown: number,

		/** @ignore */
		private readonly chat: IChat,

		/** @ignore */
		private readonly dialogManager: IDialogManager
	) {
		this.timer	= new Timer(countdown);
	}
}
