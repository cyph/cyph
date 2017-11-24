import {Component, Input} from '@angular/core';
import {User, UserPresence} from '../account';


/**
 * Angular component for account contact UI.
 */
@Component({
	selector: 'cyph-account-contact',
	styleUrls: ['../../../css/components/account-contact.scss'],
	templateUrl: '../../../templates/account-contact.html'
})
export class AccountContactComponent {
	@Input() public contact: User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	constructor () {}
}
