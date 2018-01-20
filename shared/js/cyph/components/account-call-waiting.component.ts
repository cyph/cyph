import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account call waiting UI.
 */
@Component({
	selector: 'cyph-account-call-waiting',
	styleUrls: ['../../../css/components/account-call-waiting.scss'],
	templateUrl: '../../../templates/account-call-waiting.html'
})
export class AccountCallWaitingComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
