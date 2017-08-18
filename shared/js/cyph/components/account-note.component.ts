import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, Subscription} from 'rxjs';
import {IAccountFileRecord} from '../../proto';
import {IQuillDelta} from '../iquill-delta';
import {IQuillRange} from '../iquill-range';
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
	private nameSubscription?: Subscription;

	/** @ignore */
	private readonly saveLock: LockFunction	= util.lockFunction();

	/** Indicates whether or not this is a new note. */
	public newNote: boolean	= false;

	/** Currently active note. */
	public note?: {
		content?: Observable<IQuillDelta>;
		deltas?: Observable<IQuillDelta>;
		metadata: Observable<IAccountFileRecord>;
		selections?: Observable<IQuillRange>;
	};

	/** Most recent note data. */
	public readonly noteData: {
		content?: IQuillDelta;
		id?: string;
		name: string;
	}	= {
		name: ''
	};

	/** Indicates whether or not the real-time doc UI is enabled. */
	public realTime: boolean	= false;

	/** @ignore */
	private async initDoc () : Promise<void> {
		await this.setNote(await this.accountFilesService.upload(this.noteData.name, []).result);
		this.routerService.navigate(['account', 'docs', this.noteData.id, 'edit']);
	}

	/** @ignore */
	private async setNote (id: string) : Promise<void> {
		const metadata		= this.accountFilesService.watchMetadata(id);
		const metadataValue	= await metadata.filter(o => !!o.id).take(1).toPromise();

		this.noteData.id	= metadataValue.id;
		this.noteData.name	= metadataValue.name;

		this.note			= {metadata};

		if (this.realTime) {
			const doc				= await this.accountFilesService.watchDoc(metadataValue.id);
			this.note.deltas		= doc.deltas;
			this.note.selections	= doc.selections;
		}
		else {
			this.note.content	= this.accountFilesService.watchNote(metadataValue.id);
		}

		if (this.nameSubscription) {
			this.nameSubscription.unsubscribe();
		}

		this.nameSubscription	= metadata.subscribe(o => {
			if (o.id === this.noteData.id) {
				this.noteData.name	= o.name;
			}
		});
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

		this.activatedRouteService.data.subscribe(o => {
			this.realTime	= o.realTime;

			if (this.realTime && this.newNote) {
				this.initDoc();
			}
		});

		this.activatedRouteService.params.subscribe(async o => {
			try {
				const id: string|undefined	= o.id;

				if (!id) {
					throw new Error('Invalid note ID.');
				}

				if (id === 'new') {
					this.newNote			= true;
					this.note				= undefined;
					this.noteData.content	= undefined;
					this.noteData.id		= undefined;
					this.noteData.name		= 'Untitled';

					if (this.realTime) {
						await this.initDoc();
					}
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

	/** Note change handler. */
	public async onChange (change: {
		content: IQuillDelta;
		delta: IQuillDelta;
		oldContents: IQuillDelta;
	}) : Promise<void> {
		if (!this.realTime) {
			this.noteData.content	= change.content;
			return;
		}

		return this.saveLock(async () => {
			if (!this.noteData.id) {
				return;
			}

			return this.accountFilesService.updateDoc(this.noteData.id, change.delta);
		});
	}

	/** Note selection change handler. */
	public async onSelectionChange (change: {
		oldRange: IQuillRange;
		range: IQuillRange;
	}) : Promise<void> {
		if (!this.realTime) {
			return;
		}

		return this.saveLock(async () => {
			if (!this.noteData.id) {
				return;
			}

			this.accountFilesService.updateDoc(this.noteData.id, change.range);
		});
	}

	/** Updates real-time doc title. */
	public realTimeTitleUpdate (name: string) : void {
		if (!this.realTime) {
			return;
		}

		this.saveLock(async () => {
			if (!this.noteData.id || !name) {
				return;
			}

			this.accountFilesService.updateMetadata(this.noteData.id, {name});
		});
	}

	/** Saves note. */
	public saveNote () : void {
		this.saveLock(async () => {
			if (!this.noteData.name) {
				return;
			}

			if (!this.noteData.content) {
				this.noteData.content	= this.note && this.note.content ?
					await this.note.content.take(1).toPromise() :
					<IQuillDelta> (<any> {clientID: '', ops: []})
				;
			}

			this.accountService.interstitial	= true;

			if (this.newNote) {
				this.noteData.id	=
					await this.accountFilesService.upload(
						this.noteData.name,
						this.noteData.content
					).result
				;
				await this.setNote(this.noteData.id);
			}
			else if (
				this.note &&
				(await this.note.metadata.take(1).toPromise()).id === this.noteData.id
			) {
				await this.accountFilesService.updateNote(
					this.noteData.id,
					this.noteData.content,
					this.noteData.name
				);
			}

			if (this.noteData.id) {
				this.routerService.navigate(['account', 'notes', this.noteData.id]);
				await util.sleep();
				this.accountService.interstitial	= false;
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
