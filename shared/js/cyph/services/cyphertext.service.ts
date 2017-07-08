import {Injectable} from '@angular/core';
import {List} from 'immutable';
import {IChatMessage} from '../../proto';
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
	/** Indicates whether cyphertext UI should be enabled. */
	public readonly isEnabled: boolean	=
		!this.sessionService.apiFlags.telehealth &&
		(this.envService.isLocalEnv || this.envService.isHomeSite)
	;

	/** Indicates whether cyphertext should be displayed. */
	public isVisible: boolean	= false;

	/** Cyphertext message list. */
	public messages: List<IChatMessage>	= List<IChatMessage>();

	/**
	 * Logs new cyphertext message.
	 * @param text
	 * @param author
	 */
	private async log (text: string, author: string) : Promise<void> {
		if (!text || !this.isEnabled) {
			return;
		}

		const timestamp	= await util.timestamp();

		this.messages	= this.messages.withMutations(messages =>
			(
				/* Mobile performance optimisation */
				messages.size > (this.envService.isMobile ? 5 : 50) ?
					messages.shift() :
					messages
			).push({
				author,
				id: '',
				text,
				timestamp
			})
		);
	}

	/** Hides cyphertext UI. */
	public hide () : void {
		if (!this.isVisible) {
			return;
		}

		this.isVisible	= false;

		this.dialogService.toast(this.stringsService.cypherToast3, 1000);
	}

	/** Shows cyphertext UI. */
	public async show () : Promise<void> {
		await this.dialogService.toast(this.stringsService.cypherToast1, 2000);
		await this.dialogService.toast(this.stringsService.cypherToast2, 3000);

		this.isVisible	= true;

		this.analyticsService.sendEvent({
			eventAction: 'show',
			eventCategory: 'cyphertext',
			eventValue: 1,
			hitType: 'event'
		});
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		if (this.isEnabled) {
			this.sessionService.on(
				events.cyphertext,
				(o: {author: string; cyphertext: string}) => {
					this.log(o.cyphertext, o.author);
				}
			);
		}
	}
}
