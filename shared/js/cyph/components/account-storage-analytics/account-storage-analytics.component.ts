import {Component} from '@angular/core';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {readableByteLength} from '../../util/formatting';


/**
 * Angular component for account settings UI.
 */
@Component({
	selector: 'cyph-account-storage-analytics',
	styleUrls: ['./account-storage-analytics.component.scss'],
	templateUrl: './account-storage-analytics.component.html'
})
export class AccountStorageAnalyticsComponent {
	/** @see readableByteLength */
	public readonly readableByteLength: typeof readableByteLength	= readableByteLength;

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountDatabaseService */
		public readonly accountFilesService: AccountFilesService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
