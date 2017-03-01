import {Injectable} from '@angular/core';
import {States} from './js/cyph.im/enums';


/**
 * Angular service for Cyph UI.
 */
@Injectable()
export class AppService {
	/** @see LinkConnection.baseUrl */
	public linkConnectionBaseUrl: string;

	/** @see States */
	public state: States;

	/** @see States */
	public states: typeof States	= States;

	constructor () {
		this.state	= States.blank;
	}
}
