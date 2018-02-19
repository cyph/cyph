import {Component} from '@angular/core';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account notifications subscribe UI.
 */
@Component({
	selector: 'cyph-account-notifications-subscribe',
	styleUrls: ['./account-notifications-subscribe.component.scss'],
	templateUrl: './account-notifications-subscribe.component.html'
})
export class AccountNotificationsSubscribeComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
