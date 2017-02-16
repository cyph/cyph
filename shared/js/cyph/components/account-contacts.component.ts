import {Component} from '@angular/core';
import {UserPresence} from '../account/enums';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account contacts UI.
 */
@Component({
	selector: 'cyph-account-contacts',
	styleUrls: ['../../css/components/account-contacts.css'],
	templateUrl: '../../../templates/account-contacts.html'
})
export class AccountContactsComponent {
	/** @inheritDoc */
	public getStatus (statusEnum: UserPresence) : string {
		return UserPresence[statusEnum];
	}
	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
