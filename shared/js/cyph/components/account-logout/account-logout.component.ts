import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {sleep} from '../../util/wait';

/**
 * Angular component for account logout UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-logout',
	styleUrls: ['./account-logout.component.scss'],
	templateUrl: './account-logout.component.html'
})
export class AccountLogoutComponent extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.transitionEnd();

		const loggedOut = await this.accountAuthService.logout();
		await sleep(500);

		/* Full reload to get rid of any data still sitting in memory */

		if (!loggedOut) {
			await this.router.navigate(['login']);
			return;
		}

		if ((<any> self).androidBackbuttonReady) {
			(<any> self).plugins.appMinimize.minimize();
		}

		if (this.envService.isWeb) {
			location.reload();
		}
		else {
			/* TODO: HANDLE NATIVE */
		}
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
