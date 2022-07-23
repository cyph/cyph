import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	OnInit
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import Delta from 'quill-delta';
import {BehaviorSubject, firstValueFrom, Observable} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {IAsyncList} from '../../iasync-list';
import {IQuillDelta} from '../../iquill-delta';
import {IQuillRange} from '../../iquill-range';
import {IAccountFileRecord} from '../../proto/types';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {WebSignClientService} from '../../services/crypto/websign-client.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {lockFunction} from '../../util/lock';
import {debugLog} from '../../util/log';
import {observableAll} from '../../util/observable-all';
import {getDateTimeString} from '../../util/time';
import {sleep} from '../../util/wait';

/**
 * Angular component for an individual note.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-note',
	styleUrls: ['./account-note.component.scss'],
	templateUrl: './account-note.component.html'
})
export class AccountNoteComponent
	extends BaseProvider
	implements OnDestroy, OnInit
{
	/** @ignore */
	private readonly editView = new BehaviorSubject<boolean>(false);

	/** @ignore */
	private readonly saveLock = lockFunction();

	/** @see AccountNoteComponents.anonymousMessages */
	public readonly anonymousMessages: Observable<boolean> =
		this.activatedRoute.data.pipe(map(o => !!o.anonymousMessages));

	/** @see getDateTimeString */
	public readonly getDateTimeString = getDateTimeString;

	/** Indicates whether or not this is a new note. */
	public readonly newNote = new BehaviorSubject<boolean>(false);

	/** Currently active note. */
	public readonly note = new BehaviorSubject<
		| undefined
		| {
				content?: Observable<IQuillDelta>;
				doc?: {
					asyncList: IAsyncList<IQuillDelta | IQuillRange>;
					deltas: Observable<IQuillDelta>;
					deltaSendQueue: IQuillDelta[];
					selections: Observable<IQuillRange>;
					selectionSendQueue?: IQuillRange;
				};
				record: Observable<IAccountFileRecord>;
		  }
	>(undefined);

	/** Most recent note data. */
	public readonly noteData = new BehaviorSubject<{
		content?: IQuillDelta;
		id?: string;
		nameChange?: string;
		owner?: string;
	}>({});

	/** Indicates whether or not the edit view should be displayed. */
	public readonly noteEditable: Observable<boolean> = observableAll([
		this.editView,
		this.newNote
	]).pipe(map(([editView, newNote]) => editView || newNote));

	/** Indicates whether or not the real-time doc UI is enabled. */
	public readonly realTime: BehaviorSubject<boolean> = toBehaviorSubject(
		this.activatedRoute.data.pipe(map(o => !!o.realTime)),
		false,
		this.subscriptions
	);

	/** Indicates whether spinner should be displayed. */
	public readonly showSpinner: Observable<boolean> = observableAll([
		this.newNote,
		this.realTime
	]).pipe(map(([newNote, realTime]) => newNote && realTime));

	/** @ignore */
	private async initDoc () : Promise<void> {
		await this.setNote(
			await this.accountFilesService.upload(
				this.stringsService.untitled,
				[]
			).result
		);

		this.router.navigate(['docs', this.noteData.value.id, 'edit']);
	}

	/** @ignore */
	private async setNote (id: string) : Promise<void> {
		const record = this.accountFilesService.watchMetadata(id);
		const recordValue = await firstValueFrom(
			record.pipe(filter(o => !!o.id))
		);

		this.note.next({record});
		this.updateNoteData({
			id: recordValue.id,
			owner: recordValue.owner
		});

		if (this.realTime.value) {
			this.note.next({
				doc: {
					deltaSendQueue: <IQuillDelta[]> [],
					...this.accountFilesService.getDoc(recordValue.id)
				},
				record
			});

			(async () => {
				while (
					this.note.value?.doc &&
					this.noteData.value.id === recordValue.id
				) {
					const doc = this.note.value.doc;

					if (doc.deltaSendQueue.length > 0) {
						await doc.asyncList.pushItem({
							clientID: doc.deltaSendQueue[0].clientID,
							ops:
								doc.deltaSendQueue
									.splice(0, doc.deltaSendQueue.length)
									.reduce(
										(delta, {ops}) =>
											ops ?
												delta.compose(new Delta(ops)) :
												delta,
										new Delta()
									).ops || []
						});
					}

					if (doc.selectionSendQueue) {
						await doc.asyncList.pushItem(doc.selectionSendQueue);
					}

					await sleep(500);
				}
			})();
		}
		else {
			this.note.next({
				content: this.accountFilesService.watchNote(recordValue.id),
				record
			});
		}
	}

	/** @ignore */
	private setURL (url: string) : void {
		this.editView.next(url.split('/').slice(-1)[0] === 'edit');
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		super.ngOnDestroy();

		this.webSignClientService.autoUpdateEnable.next(true);

		this.note.next(undefined);
		this.updateNoteData({id: undefined});
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.webSignClientService.autoUpdateEnable.next(false);
		this.accountService.transitionEnd();

		this.setURL(this.router.url);

		this.subscriptions.push(
			this.accountService.routeChanges.subscribe(url => {
				this.setURL(url);
			})
		);

		this.subscriptions.push(
			observableAll([
				this.activatedRoute.params,
				this.realTime
			]).subscribe(async ([o, realTime]) => {
				try {
					if (this.editView.value) {
						this.accountService.interstitial.next(true);
					}

					const id: string | undefined = o.id;

					if (!id) {
						throw new Error('Invalid note ID.');
					}

					if (id === 'new') {
						this.newNote.next(true);
						this.note.next(undefined);
						this.updateNoteData({
							content: undefined,
							id: undefined
						});

						if (realTime) {
							await this.initDoc();
						}
					}
					else {
						this.newNote.next(false);
						await this.setNote(id);
					}
				}
				catch {
					this.router.navigate(['404']);
				}
				finally {
					/* TODO: Block on Quill event instead */
					await sleep(1000);

					this.accountService.interstitial.next(false);
				}
			})
		);
	}

	/** Note change handler. */
	public async onChange (change: {
		content: IQuillDelta;
		delta: IQuillDelta;
		oldContent: IQuillDelta;
	}) : Promise<void> {
		if (!this.realTime.value) {
			this.updateNoteData({content: change.content});
			return;
		}

		if (this.note.value?.doc) {
			this.note.value.doc.deltaSendQueue.push(change.delta);
			this.note.next({...this.note.value});
		}
	}

	/** Note selection change handler. */
	public async onSelectionChange (change: {
		oldRange: IQuillRange;
		range: IQuillRange;
	}) : Promise<void> {
		if (!this.realTime.value) {
			return;
		}

		if (this.note.value?.doc) {
			this.note.value.doc.selectionSendQueue = change.range;
			this.note.next({...this.note.value});
		}
	}

	/** Updates real-time doc title. */
	public realTimeTitleUpdate () : void {
		if (!this.realTime.value || !this.noteData.value.nameChange) {
			return;
		}

		const name = this.noteData.value.nameChange;
		this.updateNoteData({nameChange: undefined});

		this.saveLock(async () => {
			if (!this.noteData.value.id) {
				return;
			}

			return this.accountFilesService.updateMetadata(
				this.noteData.value.id,
				{name}
			);
		});
	}

	/** Saves note. */
	public saveNote () : void {
		debugLog(() => ({
			saveNote: {
				note: {...this.note.value},
				noteData: {...this.noteData.value}
			}
		}));

		this.saveLock(async () => {
			const noteData = {...this.noteData.value};

			debugLog(() => ({
				saveNoteLockClaimed: {
					noteData,
					ops: noteData.content?.ops
				}
			}));

			if (!noteData.content) {
				noteData.content = this.note.value?.content ?
					await firstValueFrom(this.note.value.content) :
					<IQuillDelta> (<any> {clientID: '', ops: []});
			}

			debugLog(() => ({
				saveNoteLockContentSet: {
					noteData,
					ops: noteData.content?.ops
				}
			}));

			this.accountService.interstitial.next(true);

			if (this.newNote.value) {
				noteData.id = await this.accountFilesService.upload(
					noteData.nameChange || '',
					noteData.content
				).result;

				await this.setNote(noteData.id);
			}
			else if (
				this.note.value &&
				(await firstValueFrom(this.note.value.record)).id ===
					noteData.id
			) {
				await this.accountFilesService.updateNote(
					noteData.id,
					noteData.content,
					noteData.nameChange
				);
			}

			this.noteData.next(noteData);

			if (!noteData.id) {
				return;
			}

			this.router.navigate(['notes', noteData.id]);
			await sleep();
			this.accountService.interstitial.next(false);
			this.dialogService.toast(this.stringsService.noteSaved, 2500);
		});
	}

	/** Updates note data. */
	public updateNoteData (noteData: {
		content?: IQuillDelta;
		id?: string;
		nameChange?: string;
		owner?: string;
	}) : void {
		this.noteData.next({...this.noteData.value, ...noteData});
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly webSignClientService: WebSignClientService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see DialogService */
		public readonly dialogService: DialogService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
