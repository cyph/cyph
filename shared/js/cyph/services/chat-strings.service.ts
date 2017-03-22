import {Injectable} from '@angular/core';
import {util} from '../util';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Replaces a subset of the strings for the chat UI in certain cases.
 */
@Injectable()
export class ChatStringsService extends StringsService {
	/** @inheritDoc */
	public get friend () : string {
		return util.translate(
			!this.sessionService.apiFlags.telehealth ?
				`friend` :
				this.sessionService.state.isAlice ?
					`patient` :
					`doctor`
		);
	}

	/** @ignore */
	public set friend (_: string) {}

	constructor (
		/** @ignore */
		private readonly sessionService: SessionService
	) {
		super();

		(async () => {
			await this.sessionService.connected;
			this.sessionService.setRemoteUsername(this.friend);
		})();
	}
}
