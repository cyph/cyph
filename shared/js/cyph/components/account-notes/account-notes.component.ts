import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
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
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-notes',
	styleUrls: ['./account-notes.component.scss'],
	templateUrl: './account-notes.component.html'
})
export class AccountNotesComponent extends BaseProvider implements OnInit {
	/** List of incoming notes to display. */
	public readonly incomingNotes: Observable<(IAccountFileRecord&IAccountFileReference)[]>	=
		this.activatedRoute.data.pipe(mergeMap(o => o.realTime ?
			this.accountFilesService.incomingFilesFiltered.docs :
			this.accountFilesService.incomingFilesFiltered.notes
		))
	;

	/** List of notes to display. */
	public readonly notes: Observable<(IAccountFileRecord&{owner: string})[]>	=
		this.activatedRoute.data.pipe(mergeMap(o => o.realTime ?
			this.accountFilesService.filesListFiltered.docs :
			this.accountFilesService.filesListFiltered.notes
		))
	;

	/** Indicates whether or not the real-time doc UI is enabled. */
	public readonly realTime: Observable<boolean>	=
		this.activatedRoute.data.pipe(map(o => o.realTime))
	;

	/** @see trackByID */
	public readonly trackByID: typeof trackByID		= trackByID;

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
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
	) {
		super();
	}
}
