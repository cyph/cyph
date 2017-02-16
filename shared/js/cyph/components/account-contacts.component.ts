import {Component} from '@angular/core';
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
	public getStatus (statusEnum){
		if (statusEnum == 3){
			return "online";
		}
		if (statusEnum == 0){
			return "away";
		}
		if (statusEnum == 1){
			return "busy";
		}
		if (statusEnum == 2){
			return "offline";
		}
		else {
			return
		}
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
