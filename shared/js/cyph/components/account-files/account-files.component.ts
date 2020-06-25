import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for files UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-files',
	styleUrls: ['./account-files.component.scss'],
	templateUrl: './account-files.component.html'
})
export class AccountFilesComponent extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
