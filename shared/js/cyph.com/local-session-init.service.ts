import {Injectable} from '@angular/core';
import {SessionInitService} from '../cyph/services/session-init.service';


/**
 * Mock SessionInitService implementation that just sets blank ID.
 */
@Injectable()
export class LocalSessionInitService implements SessionInitService {
	/** @inheritDoc */
	public readonly callType?: 'audio'|'video';

	/** @inheritDoc */
	public readonly id: string	= '';

	constructor () {}
}
