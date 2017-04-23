import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account register UI.
 */
@Component({
	selector: 'cyph-account-register',
	styleUrls: ['../../css/components/account-register.css'],
	templateUrl: '../../templates/account-register.html'
})
export class AccountRegisterComponent {
	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
