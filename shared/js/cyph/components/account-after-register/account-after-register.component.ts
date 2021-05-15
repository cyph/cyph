import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
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
				this.stringsService.welcomeMasterKeySetup
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

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
