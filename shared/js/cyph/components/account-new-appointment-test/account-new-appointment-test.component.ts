import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account new appointment test UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-new-appointment-test',
	styleUrls: ['./account-new-appointment-test.component.scss'],
	templateUrl: './account-new-appointment-test.component.html'
})
export class AccountNewAppointmentTestComponent extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
