import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountProfileService} from '../services/account-profile.service';
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
	/** @inheritDoc */
	public ngOnInit () : void {
	}

	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountProfileService */
		public readonly accountProfileService: AccountProfileService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
