import {Component} from '@angular/core';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account incoming patient info UI.
 */
@Component({
	selector: 'cyph-account-incoming-patient-info',
	styleUrls: ['./account-incoming-patient-info.component.scss'],
	templateUrl: './account-incoming-patient-info.component.html'
})
export class AccountIncomingPatientInfoComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
