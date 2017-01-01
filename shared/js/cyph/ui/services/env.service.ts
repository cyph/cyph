import {Injectable} from '@angular/core';
import {Env} from '../../env';


/**
 * @see Env
 */
@Injectable()
export class EnvService extends Env {
	constructor () {
		super();
	}
}
