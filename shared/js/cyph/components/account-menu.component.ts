import {Component} from '@angular/core';
import {States, UserPresence} from '../account/enums';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountService} from '../services/account.service';
import {EnvService} from '../services/env.service';
import {UrlStateService} from '../services/url-state.service';


/**
 * Angular component for account home UI.
 */
@Component({
	selector: 'cyph-account-menu',
	styleUrls: ['../../css/components/account-menu.css'],
	templateUrl: '../../../templates/account-menu.html'
})
export class AccountMenuComponent {
	/** Indicates whether menu is open. */
	public open: boolean			= !this.envService.isMobile;

	/** @see States */
	public states: typeof States	= States;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** Goes to state. */
	public async goToState (state: States) : Promise<void> {
		if (this.envService.isMobile) {
			this.toggleMenu(false);
		}

		this.accountService.state	= state;
		this.urlStateService.setUrl('account/' + States[state]);
	}

	/** Toggles account menu. */
	public toggleMenu (open?: boolean) : void {
		if (typeof open === 'boolean') {
			this.open	= open;
		}
		else {
			this.open	= !this.open;
		}
	}

	constructor (
		/** @ignore */
		private readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see EnvAuthService */
		public readonly envService: EnvService,

		/** @see UrlStateService */
		public readonly urlStateService: UrlStateService
	) {}
}
