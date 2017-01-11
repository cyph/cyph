import {Injectable} from '@angular/core';
import {util} from '../util';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Replaces a subset of the strings for the chat UI in certain cases.
 */
@Injectable()
export class ChatStringsService extends StringsService {
	/** @see ChatStringsService */
	public readonly friend: string	= util.translate(
		!this.sessionService.apiFlags.telehealth ?
			`friend` :
			this.sessionService.state.isAlice ?
				`patient` :
				`doctor`
	);

	constructor (
		/** @ignore */
		private readonly sessionService: SessionService
	) {
		super();
	}
}
