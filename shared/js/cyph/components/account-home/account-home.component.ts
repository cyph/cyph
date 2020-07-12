import {AfterViewInit, ChangeDetectionStrategy, Component} from '@angular/core';
import {Router} from '@angular/router';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for account home UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-home',
	styleUrls: ['./account-home.component.scss'],
	templateUrl: './account-home.component.html'
})
export class AccountHomeComponent extends BaseProvider
	implements AfterViewInit {
	/** Indicates whether speed dial is open. */
	public readonly isSpeedDialOpen = new BehaviorSubject<boolean>(false);

	/** @see AccountContactsComponent.searchMode */
	public readonly searchMode: Observable<
		boolean
	> = this.accountService.routeChanges.pipe(
		map(url => url.split('/').slice(-1)[0] === 'search')
	);

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		this.accountService.autoUpdate.next(true);

		if (this.accountDatabaseService.currentUser.value?.pseudoAccount) {
			this.router.navigate(['messages']);
			return;
		}

		if (
			!this.accountDatabaseService.currentUser.value ||
			!this.accountDatabaseService.currentUser.value.masterKeyConfirmed
		) {
			this.router.navigate(['welcome']);
			return;
		}

		if (this.accountDatabaseService.currentUser.value.agseConfirmed) {
			this.router.navigate(['profile']);
			return;
		}

		this.accountService.transitionEnd();
	}

	constructor (
		/** @see Router */
		public readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
