import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {map} from 'rxjs/operators';
import {
	NewContactTypes,
	UserPresence,
	userPresenceSelectOptions
} from '../../account';
import {BaseProvider} from '../../base-provider';
import {AccountUserTypes, CyphPlans} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountInviteService} from '../../services/account-invite.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {ConfigService} from '../../services/config.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {SalesService} from '../../services/sales.service';
import {StringsService} from '../../services/strings.service';
import {trackByValue} from '../../track-by/track-by-value';
import {urlToSafeStyle} from '../../util/safe-values';
import {getDateTimeString} from '../../util/time';

/**
 * Angular component for account home UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-menu',
	styleUrls: ['./account-menu.component.scss'],
	templateUrl: './account-menu.component.html'
})
export class AccountMenuComponent extends BaseProvider {
	/** @see AccountUserTypes */
	public readonly accountUserTypes = AccountUserTypes;

	/** @see CyphPlans */
	public readonly cyphPlans = CyphPlans;

	/** @see getDateTimeSting */
	public readonly getDateTimeString = getDateTimeString;

	/** @see AccountService.menuExpanded */
	public readonly menuExpanded = this.accountService.menuExpanded.pipe(
		map(menuExpanded => this.sidenav || menuExpanded)
	);

	/** @see NewContactTypes */
	public readonly newContactTypes = NewContactTypes;

	/** If true, is inside a sidenav. */
	@Input() public sidenav: boolean = false;

	/** @see UserPresence */
	public readonly statuses = userPresenceSelectOptions;

	/** @see trackByValue */
	public readonly trackByValue = trackByValue;

	/** @see urlToSafeStyle */
	public readonly urlToSafeStyle = urlToSafeStyle;

	/** @see UserPresence */
	public readonly userPresence = UserPresence;

	/** Handler for button clicks. */
	public click () : void {
		this.accountService.toggleMobileMenu(false);
	}

	/** @see AccountAuthService.lock */
	public async lock () : Promise<void> {
		this.click();

		if (
			!(await this.dialogService.confirm({
				content: this.stringsService.lockPrompt,
				title: this.stringsService.lockTitle
			}))
		) {
			return;
		}

		await this.accountAuthService.lock();
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountInviteService */
		public readonly accountInviteService: AccountInviteService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

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
