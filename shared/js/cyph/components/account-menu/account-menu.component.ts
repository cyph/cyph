import {Component} from '@angular/core';
import {UserPresence} from '../../account/enums';
import {AccountUserTypes} from '../../proto';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account home UI.
 */
@Component({
	selector: 'cyph-account-menu',
	styleUrls: ['./account-menu.component.scss'],
	templateUrl: './account-menu.component.html'
})
export class AccountMenuComponent {
	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** Handler for button clicks. */
	public click () : void {
		/*
		if (this.envService.isMobile) {
			this.accountService.toggleMenu(false);
		}
		*/

		this.accountService.toggleMobileMenu(false);
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
