import {Component} from '@angular/core';
import {AccountDatabaseService} from '../services/account-database.service';
import {AccountSettingsService} from '../services/account-settings.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account settings UI.
 */
@Component({
	selector: 'cyph-account-settings',
	styleUrls: ['../../../css/components/account-settings.scss'],
	templateUrl: '../../../templates/account-settings.html'
})
export class AccountSettingsComponent {
	constructor (
		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
