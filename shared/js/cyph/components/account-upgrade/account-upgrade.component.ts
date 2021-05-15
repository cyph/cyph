import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ViewChild
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {take} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {InAppPurchaseComponent} from '../../components/in-app-purchase';
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
export class AccountUpgradeComponent
	extends BaseProvider
	implements AfterViewInit
{
	/** @see InAppPurchaseComponent */
	@ViewChild('inAppPurchase', {read: InAppPurchaseComponent})
	public inAppPurchase?: InAppPurchaseComponent;

	/** @see CheckoutComponent.userToken */
	public readonly userToken = this.accountService.getUserToken();

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		this.accountService.interstitial.next(true);

		const {category, item} = <
			{
				category?: string;
				item?: string;
			}
		> await this.activatedRoute.params.pipe(take(1)).toPromise();

		await this.salesService.openPricing(
			category && item ?
				[
					this.envService.homeUrl,
					'checkout/#',
					category,
					'/',
					item,
					'/userToken=',
					this.userToken
				] :
				[
					this.envService.homeUrl,
					'pricing?current=',
					CyphPlans[
						await this.accountSettingsService.plan
							.pipe(take(1))
							.toPromise()
					],
					'&userToken=',
					this.userToken
				],
			true,
			this.inAppPurchase
		);

		/* Handle non-browser case */

		if (!this.envService.isCordova) {
			return;
		}

		this.accountService.interstitial.next(false);
		await this.router.navigate(['']);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

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
