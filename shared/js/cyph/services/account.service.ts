import {Injectable} from '@angular/core';
import {States} from '../account/enums';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** Parameter passed in via URL route (e.g. a username). */
	public input: string|undefined;

	/** Indicates whether the browser extension UI should be used. */
	public isExtension: boolean	= false;

	/** @see States */
	public state: States|undefined;

	constructor () {}
}
