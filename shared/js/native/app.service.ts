import {Injectable} from '@angular/core';
import {BaseProvider} from './js/cyph/base-provider';

/**
 * Angular service for Cyph native UI.
 */
@Injectable()
/* tslint:disable-next-line:no-stateless-class */
export class AppService extends BaseProvider {
	constructor () {
		super();
	}
}
