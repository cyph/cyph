import {Injectable} from '@angular/core';
import {Config} from '../config';


/**
 * @see Config
 */
@Injectable()
export class ConfigService extends Config {
	constructor () {
		super();
	}
}
