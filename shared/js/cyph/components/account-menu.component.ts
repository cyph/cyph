import {Component} from '@angular/core';
import {UserPresence} from '../account/enums';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountService} from '../services/account.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account home UI.
 */
@Component({
	selector: 'cyph-account-menu',
	styleUrls: ['../../css/components/account-menu.css'],
	templateUrl: '../../templates/account-menu.html'
})
export class AccountMenuComponent {
	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** Handler for button clicks. */
	public click () : void {
		if (this.envService.isMobile) {
			this.accountService.toggleMenu(false);
		}
	}

	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see EnvAuthService */
		public readonly envService: EnvService
	) {
		this.accountService.toggleMenu(!this.envService.isMobile);
	}
}
