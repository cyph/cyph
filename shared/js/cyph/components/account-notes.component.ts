import {Component} from '@angular/core';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {EnvService} from '../services/env.service';
import {UtilService} from '../services/util.service';


/**
 * Angular component for notes UI.
 */
@Component({
	selector: 'cyph-account-notes',
	styleUrls: ['../../../css/components/account-notes.scss'],
	templateUrl: '../../../templates/account-notes.html'
})
export class AccountNotesComponent {
	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see UtilService */
		public readonly utilService: UtilService
	) {}
}
