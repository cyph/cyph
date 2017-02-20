import {Component, OnInit} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {UrlStateService} from '../services/url-state.service';
import {util} from '../util';


/**
 * Angular component for account logout UI.
 */
@Component({
	selector: 'cyph-account-logout',
	styleUrls: ['../../css/components/account-logout.css'],
	templateUrl: '../../../templates/account-logout.html'
})
export class AccountLogoutComponent implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountAuthService.logout();
		await util.sleep(1500);
		this.urlStateService.setUrl('account/login');
	}

	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountAuthService */
		public readonly urlStateService: UrlStateService
	) {}
}
