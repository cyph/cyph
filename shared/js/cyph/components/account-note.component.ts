import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DeltaStatic} from 'quill';
import {Observable} from 'rxjs';
import {AccountFileRecord, IAccountFileRecord} from '../../proto';
import {LockFunction} from '../lock-function-type';
import {AccountFilesService} from '../services/account-files.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {DialogService} from '../services/dialog.service';
import {StringsService} from '../services/strings.service';
import {util} from '../util';


/**
 * Angular component for an individual note.
 */
@Component({
	selector: 'cyph-account-note',
	styleUrls: ['../../../css/components/account-note.scss'],
	templateUrl: '../../../templates/account-note.html'
})
export class AccountNoteComponent implements OnInit {
	/** @ignore */
	private editView: boolean	= false;

	/** @ignore */
	private readonly saveLock: LockFunction	= util.lockFunction();

	/** Indicates whether or not this is a new note. */
	public newNote: boolean	= false;

	/** Currently active note. */
	public note?: {
		metadata: IAccountFileRecord;
		observable: Observable<DeltaStatic>;
	};

	/** Most recent note data. */
	public readonly noteData: {
		content?: DeltaStatic;
		id?: string;
		name: string;
	}	= {
		name: ''
	};

	/** @ignore */
	private async setNote (id: string) : Promise<void> {
		const metadata	= await this.accountFilesService.getFile(
			id,
			AccountFileRecord.RecordTypes.Note
		);

		this.noteData.id	= metadata.id;
		this.noteData.name	= metadata.name;

		this.note			= {
			metadata,
			observable: this.accountFilesService.watchNote(metadata.id)
		};
	}

	/** @ignore */
	private setURL (url: string) : void {
		this.editView	= url.split('/').slice(-1)[0] === 'edit';
	}

	/** Indicates whether or not the edit view should be displayed. */
	public get editable () : boolean {
		return this.editView || this.newNote;
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.setURL(this.routerService.url);
		this.routerService.events.subscribe(({url}: any) => {
			if (typeof url === 'string') {
				this.setURL(url);
			}
		});

		this.activatedRouteService.params.subscribe(async o => {
			try {
				const id: string|undefined	= o.id;

				if (!id) {
					throw new Error('Invalid note ID.');
				}

				if (id === 'new') {
					this.newNote	= true;
				}
				else {
					this.newNote	= false;
					await this.accountAuthService.ready;
					await this.setNote(id);
				}
			}
			catch (_) {
				this.routerService.navigate(['404']);
			}
		});
	}

	/** Saves note. */
	public saveNote () : void {
		this.saveLock(async () => {
			if (!this.noteData.content) {
				if (this.note) {
					this.noteData.content	= await this.note.observable.take(1).toPromise();
				}
				else {
					return;
				}
			}

			if (this.newNote) {
				this.noteData.id	=
					await this.accountFilesService.upload(
						this.noteData.name,
						this.noteData.content
					).result
				;
				await this.setNote(this.noteData.id);
			}
			else if (this.note && this.note.metadata.id === this.noteData.id) {
				await this.accountFilesService.updateNote(
					this.noteData.id,
					this.noteData.content,
					this.noteData.name
				);
			}

			if (this.noteData.id) {
				this.routerService.navigate([`account/notes/${this.noteData.id}`]);
				await util.sleep(1500);
				this.dialogService.toast(this.stringsService.noteSaved, 2500);
			}
		});
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly routerService: Router,

		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @ignore */
		public readonly dialogService: DialogService,

		/** @ignore */
		public readonly stringsService: StringsService
	) {}
}
