import {Component} from '@angular/core';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';


/**
 * Angular component for account file sharing UI.
 */
@Component({
	selector: 'cyph-account-file-sharing',
	styleUrls: ['../../../css/components/account-file-sharing.scss'],
	templateUrl: '../../../templates/account-file-sharing.html'
})
export class AccountFileSharingComponent {
	constructor (
		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService
	) {}
}
