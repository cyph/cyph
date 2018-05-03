import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import * as Delta from 'quill-delta';
import {Observable} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {IAsyncList} from '../../iasync-list';
import {IQuillDelta} from '../../iquill-delta';
import {IQuillRange} from '../../iquill-range';
import {LockFunction} from '../../lock-function-type';
import {IAccountFileRecord} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {lockFunction} from '../../util/lock';
import {sleep} from '../../util/wait';


/**
 * Angular component for an individual note.
 */
@Component({
	selector: 'cyph-account-note',
	styleUrls: ['./account-note.component.scss'],
	templateUrl: './account-note.component.html'
})
export class AccountNoteComponent implements OnDestroy, OnInit {
	/** @ignore */
	private editView: boolean	= false;

	/** @ignore */
	private readonly saveLock: LockFunction	= lockFunction();

	/** Indicates whether or not this is a new note. */
	public newNote: boolean	= false;

	/** Currently active note. */
	public note?: {
		content?: Observable<IQuillDelta>;
		doc?: {
			asyncList: IAsyncList<IQuillDelta|IQuillRange>;
			deltas: Observable<IQuillDelta>;
			deltaSendQueue: IQuillDelta[];
			selections: Observable<IQuillRange>;
			selectionSendQueue?: IQuillRange;
		};
		metadata: Observable<IAccountFileRecord>;
	};

	/** Most recent note data. */
	public readonly noteData: {
		content?: IQuillDelta;
		id?: string;
		nameChange?: string;
	}	= {};

	/** Indicates whether or not the real-time doc UI is enabled. */
	public realTime: boolean	= false;

	/** @ignore */
	private async initDoc () : Promise<void> {
		await this.setNote(
			await this.accountFilesService.upload(this.stringsService.untitled, []).result
		);

		this.router.navigate([accountRoot, 'docs', this.noteData.id, 'edit']);
	}

	/** @ignore */
	private async setNote (id: string) : Promise<void> {
		const metadata		= this.accountFilesService.watchMetadata(id);
		const metadataValue	= await metadata.pipe(filter(o => !!o.id), take(1)).toPromise();

		this.noteData.id	= metadataValue.id;
		this.note			= {metadata};

		if (this.realTime) {
			this.note.doc	= {
				deltaSendQueue: [],
				...this.accountFilesService.getDoc(metadataValue.id)
			};

			(async () => {
				while (this.note && this.note.doc && this.noteData.id === metadataValue.id) {
					const doc	= this.note.doc;

					if (doc.deltaSendQueue.length > 0) {
						await doc.asyncList.pushValue({
							clientID: doc.deltaSendQueue[0].clientID,
							ops: doc.deltaSendQueue.splice(
								0,
								doc.deltaSendQueue.length
							).reduce(
								(delta, {ops}) => ops ? delta.compose(new Delta(ops)) : delta,
								new Delta()
							).ops || []
						});
					}

					if (doc.selectionSendQueue) {
						await doc.asyncList.pushValue(doc.selectionSendQueue);
					}

					await sleep(500);
				}
			})();
		}
		else {
			this.note.content	= this.accountFilesService.watchNote(metadataValue.id);
		}
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
	public ngOnDestroy () : void {
		this.note			= undefined;
		this.noteData.id	= undefined;
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();

		this.setURL(this.router.url);
		this.router.events.subscribe(({url}: any) => {
			if (typeof url === 'string') {
				this.setURL(url);
			}
		});

		this.activatedRoute.data.subscribe(o => {
			this.realTime	= o.realTime;

			if (this.realTime && this.newNote) {
				this.initDoc();
			}
		});

		this.activatedRoute.params.subscribe(async o => {
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

					if (this.realTime) {
						await this.initDoc();
					}
				}
				else {
					this.newNote	= false;
					await this.setNote(id);
				}
			}
			catch {
				this.router.navigate([accountRoot, '404']);
			}
		});
	}

	/** Note change handler. */
	public async onChange (change: {
		content: IQuillDelta;
		delta: IQuillDelta;
		oldContent: IQuillDelta;
	}) : Promise<void> {
		if (!this.realTime) {
			this.noteData.content	= change.content;
			return;
		}
		else if (this.note && this.note.doc) {
			this.note.doc.deltaSendQueue.push(change.delta);
		}
	}

	/** Note selection change handler. */
	public async onSelectionChange (change: {
		oldRange: IQuillRange;
		range: IQuillRange;
	}) : Promise<void> {
		if (!this.realTime) {
			return;
		}
		else if (this.note && this.note.doc) {
			this.note.doc.selectionSendQueue	= change.range;
		}
	}

	/** Updates real-time doc title. */
	public realTimeTitleUpdate () : void {
		if (!this.realTime || !this.noteData.nameChange) {
			return;
		}

		const name					= this.noteData.nameChange;
		this.noteData.nameChange	= undefined;

		this.saveLock(async () => {
			if (!this.noteData.id) {
				return;
			}

			this.accountFilesService.updateMetadata(this.noteData.id, {name});
		});
	}

	/** Saves note. */
	public saveNote () : void {
		this.saveLock(async () => {
			if (!this.noteData.content) {
				this.noteData.content	= this.note && this.note.content ?
					await this.note.content.pipe(take(1)).toPromise() :
					<IQuillDelta> (<any> {clientID: '', ops: []})
				;
			}

			this.accountService.interstitial	= true;

			if (this.newNote) {
				this.noteData.id	=
					await this.accountFilesService.upload(
						this.noteData.nameChange || '',
						this.noteData.content
					).result
				;
				await this.setNote(this.noteData.id);
			}
			else if (
				this.note &&
				(await this.note.metadata.pipe(take(1)).toPromise()).id === this.noteData.id
			) {
				await this.accountFilesService.updateNote(
					this.noteData.id,
					this.noteData.content,
					this.noteData.nameChange
				);
			}

			if (this.noteData.id) {
				this.router.navigate([accountRoot, 'notes', this.noteData.id]);
				await sleep();
				this.accountService.interstitial	= false;
				this.dialogService.toast(this.stringsService.noteSaved, 2500);
			}
		});
	}

	/** Indicates whether spinner should be displayed. */
	public get showSpinner () : boolean {
		return this.realTime && this.newNote;
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see DialogService */
		public readonly dialogService: DialogService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
