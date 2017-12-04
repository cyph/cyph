import {Injectable} from '@angular/core';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** Indicates the status of the interstitial. */
	public interstitial: boolean	= false;

	/** Indicates whether the browser extension UI should be used. */
	public isExtension: boolean		= false;

	/** Indicates whether the UI is ready. */
	public isUiReady: boolean		= false;

	/** Indicates whether the telehealth UI should be used. */
	public isTelehealth: boolean	= false;

	/** Indicates whether menu is expanded. */
	public menuExpanded: boolean	= false;

	/** Resolves ready promise. */
	public resolveUiReady: () => void;

	/** Resolves after UI is ready. */
	public readonly uiReady: Promise<void>	= new Promise(resolve => {
		this.resolveUiReady	= resolve;
	});

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		this.menuExpanded	= typeof menuExpanded === 'boolean' ?
			menuExpanded :
			!this.menuExpanded
		;
	}

	constructor () {
		this.uiReady.then(() => {
			this.isUiReady	= true;
		});
	}
}
