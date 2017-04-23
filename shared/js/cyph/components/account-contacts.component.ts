import {Component} from '@angular/core';
import {States, User, UserPresence} from '../account';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountService} from '../services/account.service';
import {EnvService} from '../services/env.service';
import {UrlStateService} from '../services/url-state.service';


/**
 * Angular component for account contacts UI.
 */
@Component({
	selector: 'cyph-account-contacts',
	styleUrls: ['../../css/components/account-contacts.css'],
	templateUrl: '../../templates/account-contacts.html'
})
export class AccountContactsComponent {
	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** Indicates whether the chat UI is open for this user. */
	public isActive (contact: User) : boolean {
		return this.accountService.state === States.chat &&
			this.accountService.input === contact.username
		;
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see AccountProfileService */
		public readonly urlStateService: UrlStateService
	) {}
}
