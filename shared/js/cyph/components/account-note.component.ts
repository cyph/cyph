import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountNotesService} from '../services/account-notes.service';
import {ActivatedRoute} from '@angular/router';
import {EnvService} from '../services/env.service';
import {UtilService} from '../services/util.service';


/**
 * Angular component for an individual note.
 */
@Component({
	selector: 'cyph-account-note',
	styleUrls: ['../../../css/components/account-note.scss'],
	templateUrl: '../../../templates/account-note.html'
})
export class AccountNoteComponent {
	/** @inheritDoc */
	public ngOnInit () : void {
		this.activatedRouteService.params.subscribe(o => {
			const id: number|undefined	= o.id;

			if (!id) {
				return;
			}

			this.accountNotesService.updateNote(id);
		});
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

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
