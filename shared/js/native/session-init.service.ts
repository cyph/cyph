import {Injectable} from '@angular/core';
import {AbstractSessionInitService} from './js/cyph/services/abstract-session-init.service';


/**
 * AbstractSessionInitService implementation that currently just sets blank ID.
 */
@Injectable()
export class SessionInitService implements AbstractSessionInitService {
	/** @inheritDoc */
	public readonly callType: 'audio'|'video'|undefined;

	/** @inheritDoc */
	public readonly id: string;

	constructor () {
		this.id	= '';
	}
}
