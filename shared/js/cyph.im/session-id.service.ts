import {Injectable} from '@angular/core';
import {AbstractSessionIdService} from '../cyph/services/abstract-session-id.service';
import {UrlStateService} from '../cyph/services/url-state.service';


/**
 * AbstractSessionIdService implementation that gets ID from URL.
 */
@Injectable()
export class SessionIdService implements AbstractSessionIdService {
	/** @inheritDoc */
	public readonly id: string;

	constructor (urlStateService: UrlStateService) {
		const newUrlState	= urlStateService.getUrlSplit();
		this.id				= newUrlState.slice(-1)[0];

		urlStateService.setUrl(newUrlState.slice(0, -1).join(''), true, true);
	}
}
