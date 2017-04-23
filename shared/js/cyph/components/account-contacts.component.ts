import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account contacts UI.
 */
@Component({
	selector: 'cyph-account-contacts',
	styleUrls: ['../../css/components/account-contacts.css'],
	templateUrl: '../../templates/account-contacts.html'
})
export class AccountContactsComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
