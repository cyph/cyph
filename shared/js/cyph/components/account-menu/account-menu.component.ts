import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {map} from 'rxjs/operators';
import {UserPresence, userPresenceSelectOptions} from '../../account/enums';
import {BaseProvider} from '../../base-provider';
import {AccountUserTypes} from '../../proto';
import {AccountAppointmentsService} from '../../services/account-appointments.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByValue} from '../../track-by/track-by-value';
import {urlToSafeStyle} from '../../util/safe-values';


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
	public readonly accountUserTypes		= AccountUserTypes;

	/** @see AccountService.menuExpanded */
	public readonly menuExpanded			=
		this.accountService.menuExpanded.pipe(map(menuExpanded => this.sidenav || menuExpanded))
	;

	/** If true, is inside a sidenav. */
	@Input() public sidenav: boolean		= false;

	/** @see UserPresence */
	public readonly statuses				= userPresenceSelectOptions;

	/** @see trackByValue */
	public readonly trackByValue			= trackByValue;

	/** @see urlToSafeStyle */
	public readonly urlToSafeStyle			= urlToSafeStyle;

	/** @see UserPresence */
	public readonly userPresence			= UserPresence;

	/** Handler for button clicks. */
	public click () : void {
		/*
		if (this.envService.isMobile) {
			this.accountService.toggleMenu(false);
		}
		*/

		this.accountService.toggleMobileMenu(false);
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAppointmentsService */
		public readonly accountAppointmentsService: AccountAppointmentsService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

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
