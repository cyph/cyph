import {Component} from '@angular/core';
import {AccountFilesService} from '../services/account-files.service';
import {AccountService} from '../services/account.service';


/**
 * Angular component for viewing an individual note.
 */
@Component({
	selector: 'cyph-account-note-view',
	styleUrls: ['../../../css/components/account-note-view.scss'],
	templateUrl: '../../../templates/account-note-view.html'
})
export class AccountNoteViewComponent {
	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService
	) {}
}
