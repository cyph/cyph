import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountProfileService} from '../services/account-profile.service';
import {EnvService} from '../services/env.service';
import {UrlStateService} from '../services/url-state.service';



/**
 * Angular component for account home UI.
 */
@Component({
	selector: 'cyph-account-home',
	styleUrls: ['../../css/components/account-home.css'],
	templateUrl: '../../../templates/account-home.html'
})
export class AccountHomeComponent {
	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountContactsService */
		public readonly accountProfileService: AccountProfileService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see EnvService */
		public readonly urlStateService: UrlStateService
	) {}
}
