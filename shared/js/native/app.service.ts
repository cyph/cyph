import {Injectable} from '@angular/core';
import {AccountStates, States} from './js/cyph.im/enums';


/**
 * Angular service for Cyph UI.
 */
@Injectable()
export class AppService {
	/** @see States */
	public state: States;

	/** @see AccountStates */
	public accountState: AccountStates|undefined;

	/** @see LinkConnection.baseUrl */
	public linkConnectionBaseUrl: string;

	/** @see States */
	public states: typeof States				= States;

	/** @see AccountStates */
	public accountStates: typeof AccountStates	= AccountStates;

	constructor () {
		this.state	= States.blank;
	}
}
