import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account compose UI.
 */
@Component({
	selector: 'cyph-account-compose',
	styleUrls: ['../../../css/components/account-compose.scss'],
	templateUrl: '../../../templates/account-compose.html'
})
export class AccountComposeComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
