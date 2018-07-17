import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
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
export class NotFoundComponent implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {
		if (this.envService.isAccounts) {
			this.accountService.transitionEnd();
			this.accountService.resolveUiReady();
		}
	}

	constructor (
		/** @ignore */
		private readonly accountService: AccountService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
