import {Injectable} from '@angular/core';
import {SessionInitService} from './js/cyph/services/session-init.service';


/**
 * SessionInitService implementation that currently just sets blank ID.
 */
@Injectable()
export class UrlSessionInitService implements SessionInitService {
	/** @inheritDoc */
	public readonly callType?: 'audio'|'video';

	/** @inheritDoc */
	public readonly id: string;

	constructor () {
		this.id	= '';
	}
}
