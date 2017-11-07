import {Component} from '@angular/core';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for forms UI.
 */
@Component({
	selector: 'cyph-account-forms',
	styleUrls: ['../../../css/components/account-forms.scss'],
	templateUrl: '../../../templates/account-forms.html'
})
export class AccountFormsComponent {
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
		public readonly envService: EnvService
	) {}
}
