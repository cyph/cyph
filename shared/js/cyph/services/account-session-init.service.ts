import {Injectable} from '@angular/core';
import {SessionInitService} from './session-init.service';


/**
 * SessionInitService implementation for accounts.
 */
@Injectable()
export class AccountSessionInitService implements SessionInitService {
	/** @inheritDoc */
	public callType?: 'audio'|'video';

	/** @inheritDoc */
	public readonly ephemeral: boolean	= false;

	/** @inheritDoc */
	public readonly id: string			= '';

	constructor () {}
}
