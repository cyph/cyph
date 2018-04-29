import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {IAccountFileRecord, IAccountFileReference} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';


/**
 * Angular component for notes UI.
 */
@Component({
	selector: 'cyph-account-notes',
	styleUrls: ['./account-notes.component.scss'],
	templateUrl: './account-notes.component.html'
})
export class AccountNotesComponent implements OnInit {
	/** Indicates whether or not the real-time doc UI is enabled. */
	public realTime: boolean	= false;

	/** @see trackByID */
	public readonly trackByID: typeof trackByID	= trackByID;

	/** List of incoming notes to display. */
	public get incomingNotes () : Observable<(IAccountFileRecord&IAccountFileReference)[]> {
		return this.realTime ?
			this.accountFilesService.incomingFilesFiltered.docs :
			this.accountFilesService.incomingFilesFiltered.notes
		;
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();

		this.activatedRoute.data.subscribe(o => {
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
		private readonly activatedRoute: ActivatedRoute,

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

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
