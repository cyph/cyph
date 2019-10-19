import {
	ChangeDetectionStrategy,
	Component,
	Inject,
	OnInit,
	Optional
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
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
	public readonly accountProfile = this.activatedRoute.data.pipe(
		map(o => o.accountProfile === true)
	);

	/** @inheritDoc */
	public ngOnInit () : void {
		if (this.envService.isAccounts && this.accountService) {
			this.accountService.transitionEnd();
			this.accountService.resolveUiReady();
		}
	}

	constructor (
		/** @ignore */
		@Inject(AccountService)
		@Optional()
		private readonly accountService: AccountService | undefined,

		/** @see ActivatedRoute */
		public readonly activatedRoute: ActivatedRoute,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
