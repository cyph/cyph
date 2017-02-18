import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountProfileService} from '../services/account-profile.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account profile UI.
 */
@Component({
	selector: 'cyph-account-profile',
	styleUrls: ['../../css/components/account-profile.css'],
	templateUrl: '../../../templates/account-profile.html'
})
export class AccountProfileComponent {
	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountProfileService */
		public readonly accountProfileService: AccountProfileService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
