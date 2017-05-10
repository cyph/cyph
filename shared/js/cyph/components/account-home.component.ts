import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account home UI.
 */
@Component({
	selector: 'cyph-account-home',
	styleUrls: ['../../css/components/account-home.scss'],
	templateUrl: '../../templates/account-home.html'
})
export class AccountHomeComponent {
	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
