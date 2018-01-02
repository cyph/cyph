import {Injectable} from '@angular/core';


/**
 * Provides ID for initiating new Session.
 */
@Injectable()
export class SessionInitService {
	/** If set, indicates an initial call type for the session. */
	public readonly callType?: 'audio'|'video';

	/** Indicates whether or not this is an ephemeral session. */
	public readonly ephemeral: boolean	= true;

	/** ID for initiating new Session. */
	public readonly id: string			= '';

	constructor () {}
}
