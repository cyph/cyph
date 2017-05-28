import {Injectable} from '@angular/core';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** Indicates whether the browser extension UI should be used. */
	public isExtension: boolean		= false;

	/** Indicates whether the telehealth UI should be used. */
	public isTelehealth: boolean	= false;

	/** Indicates whether menu is expanded. */
	public menuExpanded: boolean	= false;

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		this.menuExpanded	= typeof menuExpanded === 'boolean' ?
			menuExpanded :
			!this.menuExpanded
		;
	}

	constructor () {}
}
