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
	public isExtension: boolean		= false;

	/** Indicates whether the telehealth UI should be used. */
	public isTelehealth: boolean	= false;

	/** Indicates whether menu is expanded. */
	public menuExpanded: boolean	= false;

	/** @see States */
	public state: States|undefined;

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		if (typeof menuExpanded === 'boolean') {
			this.menuExpanded	= menuExpanded;
		}
		else {
			this.menuExpanded	= !this.menuExpanded;
		}
	}

	constructor () {}
}
