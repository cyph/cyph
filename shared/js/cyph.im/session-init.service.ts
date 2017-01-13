import {Injectable} from '@angular/core';
import {AbstractSessionInitService} from '../cyph/services/abstract-session-init.service';
import {UrlStateService} from '../cyph/services/url-state.service';


/**
 * AbstractSessionInitService implementation that gets ID from URL.
 */
@Injectable()
export class SessionInitService implements AbstractSessionInitService {
	/** @inheritDoc */
	public readonly callType: 'audio'|'video'|undefined;

	/** @inheritDoc */
	public readonly id: string;

	constructor (urlStateService: UrlStateService) {
		const urlState	= urlStateService.getUrlSplit();

		this.callType	=
			urlState[0] === 'audio' ?
				'audio' :
				urlState[0] === 'video' ?
					'video' :
					undefined
		;

		this.id			= urlState[this.callType ? 1 : 0] || '';
	}
}
