import {Injectable} from '@angular/core';
import {Potassium} from '../../crypto/potassium';


/**
 * Potassium wrapper with native crypto enabled.
 */
@Injectable()
export class NativePotassiumService extends Potassium {
	constructor () {
		super(true);
	}
}
