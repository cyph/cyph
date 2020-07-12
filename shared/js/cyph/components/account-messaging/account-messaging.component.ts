import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {BaseProvider} from '../../base-provider';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account messaging UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-messaging',
	styleUrls: ['./account-messaging.component.scss'],
	templateUrl: './account-messaging.component.html'
})
export class AccountMessagingComponent extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		if (!this.envService.isMobile.value) {
			await this.router.navigate(['inbox']);
		}
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
