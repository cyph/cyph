import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {EnvService} from '../services/env.service';
import {sleep} from '../util/wait';


/**
 * Angular component for account logout UI.
 */
@Component({
	selector: 'cyph-account-logout',
	styleUrls: ['../../../css/components/account-logout.scss'],
	templateUrl: '../../../templates/account-logout.html'
})
export class AccountLogoutComponent implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		await this.accountAuthService.logout();
		await sleep(500);
		await this.routerService.navigate(['account', 'login']);

		/* Get rid of any data still sitting in memory */
		if (this.envService.isWeb) {
			location.reload();
		}
		else {
			/* TODO: HANDLE NATIVE */
		}
	}

	constructor (
		/** @ignore */
		private readonly routerService: Router,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService
	) {}
}
