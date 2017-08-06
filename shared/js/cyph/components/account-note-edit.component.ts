import {Component} from '@angular/core';
import {AccountFilesService} from '../services/account-files.service';
import {AccountService} from '../services/account.service';


/**
 * Angular component for editing an individual note.
 */
@Component({
	selector: 'cyph-account-note-edit',
	styleUrls: ['../../../css/components/account-note-edit.scss'],
	templateUrl: '../../../templates/account-note-edit.html'
})
export class AccountNoteEditComponent {
	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService
	) {}
}
