import {Injectable} from '@angular/core';
import {Potassium} from '../../crypto/potassium/potassium';


/**
 * Potassium implementation that runs it on the current thread.
 */
@Injectable()
export class MainThreadPotassiumService extends Potassium {
	constructor () {
		super();
	}
}
