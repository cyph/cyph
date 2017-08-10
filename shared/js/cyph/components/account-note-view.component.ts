import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
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
export class AccountNoteViewComponent implements OnInit {
	public editable: boolean	= false;
	public ngOnInit () : void {
		this.activatedRouteService.url.subscribe(async url => {
			const path	= url[0].path;
			if (path === 'edit') {
				this.editable	= true;
			}

		});
	}
	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see ActivatedRoute */
		public readonly activatedRouteService: ActivatedRoute
	) {}
}
