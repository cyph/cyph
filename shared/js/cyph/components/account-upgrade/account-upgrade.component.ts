import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {skip, take} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {CyphPlans} from '../../proto';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
import {SalesService} from '../../services/sales.service';

/** Redirects to upgrade page on cyph.com. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-upgrade',
	styleUrls: ['./account-upgrade.component.scss'],
	templateUrl: './account-upgrade.component.html'
})
export class AccountUpgradeComponent extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		await this.salesService.openPricing(
			[
				this.envService.homeUrl,
				'pricing?current=',
				CyphPlans[
					await this.accountSettingsService.plan
						.pipe(skip(1), take(1))
						.toPromise()
				],
				'&userToken=',
				this.accountService.getUserToken(
					this.accountService.interstitial
				)
			],
			true
		);
	}

	constructor (
		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountSettingsService: AccountSettingsService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly salesService: SalesService
	) {
		super();
	}
}
