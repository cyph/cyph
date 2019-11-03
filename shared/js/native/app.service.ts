import {Injectable} from '@angular/core';
import {BaseProvider} from './js/cyph/base-provider';

/**
 * Angular service for Cyph native UI.
 */
@Injectable()
export class AppService extends BaseProvider {
	constructor () {
		super();
	}
}
