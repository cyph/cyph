import {Injectable} from '@angular/core';
import {AccountStates} from '../../cyph.im/enums';


/**
 * @see Account service.
 */
@Injectable()
export class AccountService {
	/** @see AccountStates */
	public accountStates: typeof AccountStates	= AccountStates;

	constructor () {}
}
