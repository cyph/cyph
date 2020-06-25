import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {AccountFileRecord} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for EHR access UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-ehr-access',
	styleUrls: ['./account-ehr-access.component.scss'],
	templateUrl: './account-ehr-access.component.html'
})
export class AccountEhrAccessComponent extends BaseProvider implements OnInit {
	/** @see AccountFileRecord.RecordTypes */
	public readonly recordType = AccountFileRecord.RecordTypes.EhrApiKey;

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

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
