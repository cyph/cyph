import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';


/**
 * Angular component for account home UI.
 */
@Component({
	selector: 'cyph-account-logout',
	styleUrls: ['../../css/components/account-logout.css'],
	templateUrl: '../../../templates/account-logout.html'
})
export class AccountLogoutComponent {
	public ngOnInit(){
		this.accountAuthService.logout();
	}
	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,
	) {}
}
