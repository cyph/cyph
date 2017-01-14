import {Injectable} from '@angular/core';
import {BetaStates, States} from './js/cyph.im/enums';


/**
 * Angular service for Cyph UI.
 */
@Injectable()
export class AppService {
	/** @see States */
	public state: States;

	/** @see BetaStates */
	public betaState: BetaStates|undefined;

	/** @see LinkConnection.baseUrl */
	public linkConnectionBaseUrl: string;

	/** @see States */
	public states: typeof States			= States;

	/** @see BetaStates */
	public betaStates: typeof BetaStates	= BetaStates;

	constructor () {
		this.state	= States.blank;
	}
}
