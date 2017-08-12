import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import * as htmlToText from 'html-to-text';
import * as msgpack from 'msgpack-lite';
import {DeltaStatic} from 'quill';
import * as QuillDeltaToHtml from 'quill-delta-to-html';
import {Observable} from 'rxjs';
import {AccountFileRecord, Form, IAccountFileRecord, IForm} from '../../proto';
import {SecurityModels} from '../account';
import {BinaryProto, BlobProto, DataURIProto} from '../protos';
import {util} from '../util';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';
import {DialogService} from './dialog.service';
import {StringsService} from './strings.service';


/**
 * Account file service.
 */
@Injectable()
export class AccountFilesService {
	/** @ignore */
	private readonly noteSnippets: Map<string, string>	= new Map<string, string>();

	/** List of file records owned by current user, sorted by timestamp in descending order. */
	public readonly filesList: Observable<IAccountFileRecord[]>	= util.flattenObservablePromise(
		this.accountDatabaseService.watchList<IAccountFileRecord>(
			'fileRecords',
			AccountFileRecord
		).map(records =>
			records.
				map(({value}) => value).
				sort((a, b) => b.timestamp - a.timestamp)
		),
		[]
	);

	/**
	 * Files filtered by record type.
	 * @see files
	 */
	public readonly filteredFiles	= {
		files: this.filterFiles(AccountFileRecord.RecordTypes.File),
		forms: this.filterFiles(AccountFileRecord.RecordTypes.Form),
		notes: this.filterFiles(AccountFileRecord.RecordTypes.Note)
	};

	/** @ignore */
	private deltaToString (delta: DeltaStatic) : string {
		return htmlToText.fromString(new QuillDeltaToHtml(delta.ops).convert());
	}

	/** @ignore */
	private fileIsDelta (file: DeltaStatic|File|IForm) : boolean {
		const maybeDelta	= <any> file;
		return typeof maybeDelta.chop === 'function' || maybeDelta.ops instanceof Array;
	}

	/** @ignore */
	private filterFiles (
		filterRecordTypes: AccountFileRecord.RecordTypes
	) : Observable<IAccountFileRecord[]> {
		return util.flattenObservablePromise(
			this.filesList.map(files => files.filter(({recordType}) =>
				!filterRecordTypes || recordType === filterRecordTypes
			)),
			[]
		);
	}

	/** Downloads and saves file. */
	public downloadAndSave (id: string) : {
		progress: Observable<number>;
		result: Promise<void>;
	} {
		const {progress, result}	= this.accountDatabaseService.downloadItem(
			`files/${id}`,
			BinaryProto
		);

		return {
			progress,
			result: (async () => {
				const file	= await this.getFile(id);

				await util.saveFile(
					(await result).value,
					file.name,
					file.mediaType
				);
			})()
		};
	}

	/** Downloads file and returns form. */
	public downloadForm (id: string) : {
		progress: Observable<number>;
		result: Promise<IForm>;
	} {
		const {progress, result}	= this.accountDatabaseService.downloadItem(
			`files/${id}`,
			Form,
			SecurityModels.privateSigned
		);

		return {progress, result: (async () => (await result).value)()};
	}

	/** Downloads file and returns as data URI. */
	public downloadURI (id: string) : {
		progress: Observable<number>;
		result: Promise<SafeUrl|string>;
	} {
		const {progress, result}	=
			this.accountDatabaseService.downloadItem(`files/${id}`, DataURIProto)
		;
		return {progress, result: (async () => (await result).value)()};
	}

	/** Gets the specified file record. */
	public async getFile (
		id: string,
		recordType?: AccountFileRecord.RecordTypes
	) : Promise<IAccountFileRecord> {
		const file	= await this.accountDatabaseService.getItem(
			`fileRecords/${id}`,
			AccountFileRecord
		);

		if (recordType !== undefined && file.recordType !== recordType) {
			throw new Error('Specified file does not exist.');
		}

		return file;
	}

	/** Gets the Material icon name for the file default thumbnail. */
	public getThumbnail (mediaType: string) : 'insert_drive_file'|'movie'|'photo' {
		const typeCategory	= mediaType.split('/')[0];

		switch (typeCategory) {
			case 'image':
				return 'photo';

			case 'video':
				return 'movie';

			default:
				return 'insert_drive_file';
		}
	}

	/** Returns a snippet of a note to use as a preview. */
	public noteSnippet (id: string) : string {
		if (!this.noteSnippets.has(id)) {
			this.noteSnippets.set(id, '...');

			(async () => {
				const limit		= 75;
				const content	= this.deltaToString(
					msgpack.decode(
						await this.accountDatabaseService.getItem(`files/${id}`, BinaryProto)
					)
				);

				this.noteSnippets.set(
					id,
					content.length > limit ?
						`${content.substr(0, limit)}...` :
						content
				);
			})();
		}

		return this.noteSnippets.get(id) || '';
	}

	/** Opens a file. */
	public async openFile (id: string) : Promise<void> {
		const file	= await this.getFile(id);

		if (file.mediaType.indexOf('image/') === 0) {
			this.dialogService.image(await this.downloadURI(id).result);
		}
		else {
			this.downloadAndSave(id);
		}
	}

	/** Removes a file. */
	public async remove (
		id: string|IAccountFileRecord|Promise<IAccountFileRecord>,
		confirm: boolean = true
	) : Promise<void> {
		if (typeof id !== 'string') {
			id	= (await id).id;
		}

		if (
			confirm &&
			!(await this.dialogService.confirm({
				content: `${this.stringsService.deleteMessage} ${(await this.getFile(id)).name}?`,
				title: this.stringsService.deleteConfirm
			}))
		) {
			return;
		}

		await Promise.all([
			this.accountDatabaseService.removeItem(`files/${id}`),
			this.accountDatabaseService.removeItem(`fileRecords/${id}`)
		]);
	}

	/** Overwrites an existing note. */
	public async updateNote (id: string, content: DeltaStatic, name?: string) : Promise<void> {
		const file		= await this.getFile(id, AccountFileRecord.RecordTypes.Note);
		file.size		= this.potassiumService.fromString(this.deltaToString(content)).length;
		file.timestamp	= await util.timestamp();

		if (name) {
			file.name	= name;
		}

		await Promise.all([
			this.accountDatabaseService.setItem(
				`files/${id}`,
				BinaryProto,
				msgpack.encode(content)
			),
			this.accountDatabaseService.setItem(`fileRecords/${id}`, AccountFileRecord, file)
		]);
	}

	/** Uploads new file. */
	public upload (name: string, file: DeltaStatic|File|IForm) : {
		progress: Observable<number>;
		result: Promise<string>;
	} {
		const id	= util.uuid();
		const url	= `files/${id}`;

		const {progress, result}	= file instanceof Blob ?
			this.accountDatabaseService.uploadItem(url, BlobProto, file) :
			this.fileIsDelta(file) ?
				this.accountDatabaseService.uploadItem(url, BinaryProto, msgpack.encode(file)) :
				this.accountDatabaseService.uploadItem(
					url,
					Form,
					file,
					SecurityModels.privateSigned
				)
		;

		return {
			progress,
			result: result.then(async () => {
				await this.accountDatabaseService.setItem(
					`fileRecords/${id}`,
					AccountFileRecord,
					{
						id,
						mediaType: file instanceof Blob ?
							file.type :
							this.fileIsDelta(file) ?
								'cyph/note' :
								'cyph/form'
						,
						name,
						recordType: file instanceof Blob ?
							AccountFileRecord.RecordTypes.File :
							this.fileIsDelta(file) ?
								AccountFileRecord.RecordTypes.Note :
								AccountFileRecord.RecordTypes.Form
						,
						size: file instanceof Blob ?
							file.size :
							this.fileIsDelta(file) ?
								this.potassiumService.fromString(
									this.deltaToString(<DeltaStatic> file)
								).length :
								NaN
						,
						timestamp: await util.timestamp()
					}
				);

				return id;
			})
		};
	}

	/** Watches note. */
	public watchNote (id: string) : Observable<DeltaStatic> {
		return this.accountDatabaseService.watch(`files/${id}`, BinaryProto).map(o =>
			o.value.length > 0 ? msgpack.decode(o.value) : {ops: []}
		);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {}
}
