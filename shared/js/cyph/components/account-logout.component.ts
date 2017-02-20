import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {UrlStateService} from '../services/url-state.service';

/**
 * Angular component for account home UI.
 */
@Component({
	selector: 'cyph-account-logout',
	styleUrls: ['../../css/components/account-logout.css'],
	templateUrl: '../../../templates/account-logout.html'
})
export class AccountLogoutComponent {
	public async ngOnInit () : Promise<void> {
		this.accountAuthService.logout();
		setTimeout (
			() => this.urlStateService.setUrl('account/login'),
			1500
		);
	}
	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountAuthService */
		public readonly urlStateService: UrlStateService
	) {}
}
