import {Injectable} from '@angular/core';
import {SessionInitService} from '../cyph/services/session-init.service';
import {UrlStateService} from '../cyph/services/url-state.service';


/**
 * SessionInitService implementation that gets ID from URL.
 */
@Injectable()
export class UrlSessionInitService implements SessionInitService {
	/** @inheritDoc */
	public readonly callType?: 'audio'|'video';

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

		if (!this.callType) {
			this.callType	= customBuildCallType;
		}
	}
}
