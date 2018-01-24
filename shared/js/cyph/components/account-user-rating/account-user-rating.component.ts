import {Component} from '@angular/core';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account user rating UI.
 */
@Component({
	selector: 'cyph-account-user-rating',
	styleUrls: ['./account-user-rating.component.scss'],
	templateUrl: './account-user-rating.component.html'
})
export class AccountUserRatingComponent {
	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
