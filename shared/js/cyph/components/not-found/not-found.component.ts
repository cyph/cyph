import {Component, Inject, OnInit, Optional} from '@angular/core';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for the cyph not found screen.
 */
@Component({
	selector: 'cyph-not-found',
	styleUrls: ['./not-found.component.scss'],
	templateUrl: './not-found.component.html'
})
export class NotFoundComponent implements OnInit {
	/** Indicates whether this is an accounts 404. */
	public get accounts () : boolean {
		return this.accountService !== undefined;
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		if (this.accountService) {
			this.accountService.transitionEnd();
			this.accountService.resolveUiReady();
		}
	}

	constructor (
		/** @ignore */
		@Inject(AccountService) @Optional()
		private readonly accountService: AccountService|undefined,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
