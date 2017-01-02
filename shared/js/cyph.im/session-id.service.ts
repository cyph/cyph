import {Injectable} from '@angular/core';
import {AbstractSessionIdService} from '../cyph/ui/services/abstract-session-id.service';
import {UrlStateService} from '../cyph/ui/services/url-state.service';


/**
 * AbstractSessionIdService implementation that gets ID from URL.
 */
@Injectable()
export class SessionIdService implements AbstractSessionIdService {
	/** @see AbstractSessionIdService.id */
	public readonly id: string;

	constructor (urlStateService: UrlStateService) {
		const newUrlState	= urlStateService.getUrlSplit();
		this.id				= newUrlState.slice(-1)[0];

		urlStateService.setUrl(newUrlState.slice(0, -1).join(''), true, true);
	}
}
