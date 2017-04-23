import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account settings UI.
 */
@Component({
	selector: 'cyph-account-settings',
	styleUrls: ['../../css/components/account-settings.css'],
	templateUrl: '../../templates/account-settings.html'
})
export class AccountSettingsComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
