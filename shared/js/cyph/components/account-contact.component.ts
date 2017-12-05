import {Component, Input} from '@angular/core';
import {User, UserPresence} from '../account';
import {AccountService} from '../services/account.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account contact UI.
 */
@Component({
	selector: 'cyph-account-contact',
	styleUrls: ['../../../css/components/account-contact.scss'],
	templateUrl: '../../../templates/account-contact.html'
})
export class AccountContactComponent {
	/** Contact. */
	@Input() public contact: User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
