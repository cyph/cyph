import {Injectable} from '@angular/core';
import {AbstractSessionIdService} from '../cyph/ui/services/abstract-session-id.service';
import {urlState} from '../cyph/url-state';


/**
 * AbstractSessionIdService implementation that gets ID from URL.
 */
@Injectable()
export class SessionIdService implements AbstractSessionIdService {
	/** @see AbstractSessionIdService.id */
	public readonly id: string;

	constructor () {
		const newUrlState	= urlState.getUrlSplit();
		this.id				= newUrlState.slice(-1)[0];

		urlState.setUrl(newUrlState.slice(0, -1).join(''), true, true);
	}
}
