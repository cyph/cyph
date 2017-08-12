import {Injectable} from '@angular/core';
import {DialogService} from './dialog.service';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** Indicates the status of the interstitial. */
	public interstitial				= false;

	/** Indicates whether the browser extension UI should be used. */
	public isExtension: boolean		= false;

	/** Indicates whether the telehealth UI should be used. */
	public isTelehealth: boolean	= false;

	/** Indicates whether menu is expanded. */
	public menuExpanded: boolean	= false;

	/** Temporary method for handling not-yet-implemented features. */
	public async notImplemented (feature: string) : Promise<void> {
		return this.dialogService.alert({
			content: `${feature} has not yet been implemented.`,
			title: 'Cyph Accounts'
		});
	}

	public setInterstitial	= (bool: boolean) => { this.interstitial	= bool; };

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		this.menuExpanded	= typeof menuExpanded === 'boolean' ?
			menuExpanded :
			!this.menuExpanded
		;
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService
	) {}
}
