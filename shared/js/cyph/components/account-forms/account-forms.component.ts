import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {AccountFileRecord} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for forms UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-forms',
	styleUrls: ['./account-forms.component.scss'],
	templateUrl: './account-forms.component.html'
})
export class AccountFormsComponent extends BaseProvider implements OnInit {
	/** @see AccountFileRecord.RecordTypes */
	public readonly recordType = AccountFileRecord.RecordTypes.Form;

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
