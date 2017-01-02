import {Injectable} from '@angular/core';


/**
 * Provides ID for initiating new Session.
 */
@Injectable()
export class AbstractSessionIdService {
	/** ID for initiating new Session. */
	public readonly id: string;

	constructor () {
		throw new Error('Must provide an implementation of AbstractSessionIdService.');
	}
}
