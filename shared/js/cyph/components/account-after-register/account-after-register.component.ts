import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {BehaviorSubject, map} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {observableAll} from '../../util/observable-all';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {SalesService} from '../../services/sales.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account post-registration UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-after-register',
	styleUrls: ['./account-after-register.component.scss'],
	templateUrl: './account-after-register.component.html'
})
export class AccountAfterRegisterComponent
	extends BaseProvider
	implements OnInit
{
	public readonly skipUpsell: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

	public readonly upsell = observableAll([this.skipUpsell, this.salesService.upsellAllowed]).pipe(map(([skipUpsell, upsellAllowed]) => !skipUpsell && upsellAllowed));

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		if (
			this.accountDatabaseService.currentUser.value?.agseConfirmed &&
			this.accountDatabaseService.currentUser.value?.masterKeyConfirmed
		) {
			this.router.navigate(['']);
			return;
		}

		this.accountService.setHeader(
			this.accountDatabaseService.currentUser.value?.masterKeyConfirmed ?
				this.stringsService.welcomeToProduct :
				{
					mobile: this.stringsService
						.registerPostSimpleRegisterSetupTitle
				}
		);

		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SalesService */
		public readonly salesService: SalesService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
