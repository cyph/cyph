import {
	ChangeDetectionStrategy,
	Component,
	Inject,
	OnInit,
	Optional
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for the cyph not found screen.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-not-found',
	styleUrls: ['./not-found.component.scss'],
	templateUrl: './not-found.component.html'
})
export class NotFoundComponent extends BaseProvider implements OnInit {
	/** Indicates whether to display the user profile variant of 404 content. */
	public readonly accountProfile = this.activatedRoute.data.pipe(
		map(o => o.accountProfile === true)
	);

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		if (
			!this.envService.isAccounts ||
			!this.accountService ||
			!this.accountDatabaseService
		) {
			return;
		}

		/* Workaround for edge case where app starts up preloading an unexpected route */
		if (
			this.envService.isCordova &&
			!this.accountDatabaseService.currentUser.value
		) {
			this.router.navigate(['']);
			return;
		}

		/* Workaround for bizarre Electron/Chromium behavior on Windows */
		const windowsURLPrefix = 'C:/%23';
		if (this.router.url.startsWith(windowsURLPrefix)) {
			this.router.navigateByUrl(
				this.router.url.slice(windowsURLPrefix.length)
			);
			return;
		}

		if (this.router.url.split('/').slice(-1)[0] !== '404') {
			this.router.navigate(['404']);
			return;
		}

		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		@Inject(AccountService)
		@Optional()
		private readonly accountService: AccountService | undefined,

		/** @ignore */
		@Inject(AccountDatabaseService)
		@Optional()
		private readonly accountDatabaseService:
			| AccountDatabaseService
			| undefined,

		/** @see ActivatedRoute */
		public readonly activatedRoute: ActivatedRoute,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SessionService */
		@Inject(SessionService)
		@Optional()
		public readonly sessionService: SessionService | undefined,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
