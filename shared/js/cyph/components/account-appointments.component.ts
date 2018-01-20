import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account appointments UI.
 */
@Component({
	selector: 'cyph-account-appointments',
	styleUrls: ['../../../css/components/account-appointments.scss'],
	templateUrl: '../../../templates/account-appointments.html'
})
export class AccountAppointmentsComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
