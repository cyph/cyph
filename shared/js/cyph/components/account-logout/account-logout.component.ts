import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {StringsService} from '../../services/strings.service';
import {sleep} from '../../util/wait';
import {closeWindow} from '../../util/window';

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
		super.ngOnInit();

		this.accountService.transitionEnd();

		const [loggedOut] = await Promise.all([
			this.accountAuthService.logout(),
			sleep(1000)
		]);

		/* Full reload to get rid of any data still sitting in memory */

		if (!loggedOut) {
			await this.router.navigate(['login']);
			return;
		}

		closeWindow();
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

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
