import {Injectable} from '@angular/core';
import {ChatRootStates} from './js/cyph.im/enums';


/**
 * Angular service for Cyph native UI.
 */
@Injectable()
export class AppService {
	/** @see ChatRootStates */
	public chatRootState: ChatRootStates	= ChatRootStates.blank;

	/** @see LinkConnection.baseUrl */
	public linkConnectionBaseUrl: string;

	constructor () {}
}
