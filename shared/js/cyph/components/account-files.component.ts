import {Component} from '@angular/core';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';
import {readableByteLength} from '../util/formatting';


/**
 * Angular component for files UI.
 */
@Component({
	selector: 'cyph-account-files',
	styleUrls: ['../../../css/components/account-files.scss'],
	templateUrl: '../../../templates/account-files.html'
})
export class AccountFilesComponent {
	/** @see readableByteLength */
	public readonly readableByteLength: typeof readableByteLength	= readableByteLength;

	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
