import {analytics} from '../../analytics';
import {events} from '../../session/enums';
import {strings} from '../../strings';
import {util} from '../../util';
import {IChatMessage} from '../chat/ichat-message';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {SessionService} from './session.service';


/**
 * Manages cyphertext chat UI.
 */
export class CyphertextService {
	/** Indicates whether cyphertext should be displayed. */
	public isVisible: boolean	= false;

	/** Cyphertext message list. */
	public readonly messages: IChatMessage[]	= [];

	/**
	 * Logs new cyphertext message.
	 * @param text
	 * @param author
	 */
	private log (text: string, author: string) : void {
		if (!text) {
			return;
		}

		/* Mobile performance optimisation */
		if (this.messages.length > (this.envService.isMobile ? 5 : 50)) {
			this.messages.shift();
		}

		const timestamp	= util.timestamp();

		this.messages.push({
			author,
			text,
			timestamp,
			timeString: util.getTimeString(timestamp),
			unread: false
		});
	}

	/** Hides cyphertext UI. */
	public hide () : void {
		if (!this.isVisible) {
			return;
		}

		this.isVisible	= false;

		this.dialogService.toast({
			content: strings.cypherToast3,
			delay: 1000
		});
	}

	/** Shows cyphertext UI. */
	public async show () : Promise<void> {
		await this.dialogService.toast({
			content: strings.cypherToast1,
			delay: 2000
		});

		await this.dialogService.toast({
			content: strings.cypherToast2,
			delay: 3000
		});

		this.isVisible	= true;

		analytics.sendEvent({
			eventAction: 'show',
			eventCategory: 'cyphertext',
			eventValue: 1,
			hitType: 'event'
		});
	}

	constructor (
		sessionService: SessionService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		sessionService.on(
			events.cyphertext,
			(o: {cyphertext: string; author: string}) => this.log(o.cyphertext, o.author)
		);
	}
}
