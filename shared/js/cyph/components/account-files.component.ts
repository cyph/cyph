import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for Cyph.io
 */
@Component({
	selector: 'cyph-account-files',
	styleUrls: ['../../css/components/account-files.css'],
	templateUrl: '../../../templates/account-file-upload.html'
})
export class AccountFilesComponent {

	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,
		
		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
