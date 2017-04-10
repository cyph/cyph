import {Injectable} from '@angular/core';


/**
 * Provides ID for initiating new Session.
 */
@Injectable()
export class SessionInitService {
	/** If set, indicates an initial call type for the session. */
	public readonly callType?: 'audio'|'video';

	/** ID for initiating new Session. */
	public readonly id: string	= '';

	constructor () {}
}
