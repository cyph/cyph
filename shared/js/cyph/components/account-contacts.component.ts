import {Component} from '@angular/core';
import {States, UserPresence} from '../account/enums';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountService} from '../services/account.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account contacts UI.
 */
@Component({
	selector: 'cyph-account-contacts',
	styleUrls: ['../../css/components/account-contacts.css'],
	templateUrl: '../../../templates/account-contacts.html'
})
export class AccountContactsComponent {
	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @see States */
	public states: typeof States	= States;

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
