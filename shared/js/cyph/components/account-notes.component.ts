import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs/Observable';
import {IAccountFileRecord, IAccountFileReference} from '../../proto';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
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
export class AccountNotesComponent implements OnInit {
	/** Indicates whether or not the real-time doc UI is enabled. */
	public realTime: boolean	= false;

	/** List of incoming notes to display. */
	public get incomingNotes () : Observable<(IAccountFileRecord&IAccountFileReference)[]> {
		return this.realTime ?
			this.accountFilesService.incomingFilesFiltered.docs :
			this.accountFilesService.incomingFilesFiltered.notes
		;
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.activatedRouteService.data.subscribe(o => {
			this.realTime	= o.realTime;
		});
	}

	/** List of notes to display. */
	public get notes () : Observable<(IAccountFileRecord&{owner: string})[]> {
		return this.realTime ?
			this.accountFilesService.filesListFiltered.docs :
			this.accountFilesService.filesListFiltered.notes
		;
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @see AccountService */
		public readonly accountService: AccountService,

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

		/** @see UtilService */
		public readonly utilService: UtilService
	) {}
}
