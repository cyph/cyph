import {Injectable} from '@angular/core';
import {IChatMessage} from '../chat/ichat-message';
import {events} from '../session/enums';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Manages cyphertext chat UI.
 */
@Injectable()
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
			content: this.stringsService.cypherToast3,
			delay: 1000
		});
	}

	/** Shows cyphertext UI. */
	public async show () : Promise<void> {
		await this.dialogService.toast({
			content: this.stringsService.cypherToast1,
			delay: 2000
		});

		await this.dialogService.toast({
			content: this.stringsService.cypherToast2,
			delay: 3000
		});

		this.isVisible	= true;

		this.analyticsService.sendEvent({
			eventAction: 'show',
			eventCategory: 'cyphertext',
			eventValue: 1,
			hitType: 'event'
		});
	}

	constructor (
		sessionService: SessionService,

		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		sessionService.on(
			events.cyphertext,
			(o: {author: string; cyphertext: string}) => { this.log(
				o.cyphertext,
				o.author
			); }
		);
	}
}
