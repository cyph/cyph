import {Injectable} from '@angular/core';
import {States} from '../account/enums';


/**
 * @see Account service.
 */
@Injectable()
export class AccountService {
	/** @see States */
	public state: States|undefined;

	constructor () {}
}
