import {Component} from '@angular/core';
import {AccountService} from '../services/account.service';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account post register UI.
 */
@Component({
	selector: 'cyph-account-post-register',
	styleUrls: ['../../../css/components/account-post-register.scss'],
	templateUrl: '../../../templates/account-post-register.html'
})
export class AccountPostRegisterComponent {
	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
