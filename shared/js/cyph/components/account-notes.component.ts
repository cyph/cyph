import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountNotesService} from '../services/account-notes.service';
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
		public readonly accountNotesService: AccountNotesService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see UtilService */
		public readonly utilService: UtilService
	) {}
}
