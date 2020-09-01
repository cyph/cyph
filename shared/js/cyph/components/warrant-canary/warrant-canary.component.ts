import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';
import {warrantCanaryDate} from './warrant-canary-date';

/**
 * Angular component for warrant canary UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-warrant-canary',
	styleUrls: ['./warrant-canary.component.scss'],
	templateUrl: './warrant-canary.component.html'
})
export class WarrantCanaryComponent extends BaseProvider implements OnInit {
	/** @see warrantCanaryDate */
	public readonly warrantCanaryDate = warrantCanaryDate;

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.setHeader(this.stringsService.warrantCanary);

		this.accountService.resolveUiReady();
		this.accountService.transitionEnd();
	}

	constructor (
		/** @ignore */
		private readonly accountService: AccountService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
