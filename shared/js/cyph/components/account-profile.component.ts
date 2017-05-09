import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account profile UI.
 */
@Component({
	selector: 'cyph-account-profile',
	styleUrls: ['../../../css/components/account-profile.scss'],
	templateUrl: '../../../templates/account-profile.html'
})
export class AccountProfileComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
