import {Injectable} from '@angular/core';
import {States} from '../account/enums';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** Username of user whose profile is being viewed. */
	public input: string|undefined;

	/** Indicates whether the browser extension UI should be used. */
	public isExtension: boolean	= false;

	/** @see States */
	public state: States|undefined;

	constructor () {}
}
