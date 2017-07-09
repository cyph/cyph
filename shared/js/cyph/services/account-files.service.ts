import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
	AccountFileRecord,
	AccountFileRecordList,
	IAccountFileRecord,
	IAccountFileRecordList
} from '../../proto';
import {IAsyncValue} from '../iasync-value';
import {util} from '../util';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';


/**
 * Account file service.
 */
@Injectable()
export class AccountFilesService {
	/** @ignore */
	private readonly noteSnippets: Map<string, string>	= new Map<string, string>();

	/** List of file records owned by current user, sorted by timestamp in descending order. */
	public readonly files: IAsyncValue<IAccountFileRecordList>	=
		this.accountDatabaseService.getAsyncValueObject<IAccountFileRecordList>(
			'fileList',
			AccountFileRecordList,
			() => ({records: []})
		)
	;

	/**
	 * Files filtered by record type.
	 * @see files
	 */
	public readonly filteredFiles	= {
		files: this.filterFiles(AccountFileRecord.RecordType.FILE),
		notes: this.filterFiles(AccountFileRecord.RecordType.NOTE)
	};

	/** @ignore */
	private filterFiles (
		filterRecordType: AccountFileRecord.RecordType
	) : Observable<IAccountFileRecord[]> {
		return this.files.watch().map(files =>
			(files.records || []).filter(o =>
				!filterRecordType || o.recordType === filterRecordType
			)
		);
	}

	/** Downloads and saves file. */
	public downloadAndSave (id: string) : {
		progress: Observable<number>;
		result: Promise<void>;
	} {
		const {progress, result}	= this.accountDatabaseService.downloadItem(`files/${id}`);

		return {
			progress,
			result: (async () => {
				await util.saveFile(
					(await result).value,
					(await this.getFile(id)).file.name
				);
			})()
		};
	}

	/** Downloads file and returns text. */
	public downloadText (id: string) : {
		progress: Observable<number>;
		result: Promise<string>;
	} {
		const {progress, result}	=
			this.accountDatabaseService.downloadItemString(`files/${id}`)
		;
		return {progress, result: (async () => (await result).value)()};
	}

	/** Downloads file and returns as data URI. */
	public downloadURI (id: string) : {
		progress: Observable<number>;
		result: Promise<string>;
	} {
		const {progress, result}	=
			this.accountDatabaseService.downloadItemURI(`files/${id}`)
		;
		return {progress, result: (async () => (await result).value)()};
	}

	/** Gets the specified file record. */
	public async getFile (
		id: string,
		filterRecordType?: AccountFileRecord.RecordType,
		files?: IAccountFileRecord[]
	) : Promise<{
		file: IAccountFileRecord;
		files: IAccountFileRecord[];
	}> {
		if (!files) {
			files	= (await this.files.getValue()).records || [];
		}

		const file	= files.find(o =>
			o.id === id &&
			(!filterRecordType || o.recordType === filterRecordType)
		);

		if (!file) {
			throw new Error('Specified file does not exist.');
		}

		return {file, files};
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
				const content	= await this.downloadText(id).result;

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

	/** Overwrites an existing note. */
	public async updateNote (id: string, content: string) : Promise<void> {
		await this.getFile(id, AccountFileRecord.RecordType.NOTE);
		await this.accountDatabaseService.setItem(`files/${id}`, content);

		await this.files.updateValue(async fileRecordList => {
			const files		= fileRecordList.records || [];
			const {file}	= await this.getFile(id, AccountFileRecord.RecordType.NOTE, files);
			file.size		= this.potassiumService.fromString(content).length;
			file.timestamp	= await util.timestamp();

			return {records: files.sort((a, b) => b.timestamp - a.timestamp)};
		});
	}

	/** Uploads new file. */
	public upload (name: string, file: string|File) : {
		progress: Observable<number>;
		result: Promise<void>;
	} {
		const id	= util.uuid();

		const {progress, result}	=
			this.accountDatabaseService.uploadItem(`files/${id}`, file)
		;

		return {
			progress,
			result: result.then(async () => this.files.updateValue(async fileRecordList =>
				({records: (fileRecordList.records || []).concat({
					id,
					mediaType: typeof file === 'string' ?
						'text/plain' :
						file.type
					,
					name,
					recordType: typeof file === 'string' ?
						AccountFileRecord.RecordType.NOTE :
						AccountFileRecord.RecordType.FILE
					,
					size: typeof file === 'string' ?
						this.potassiumService.fromString(file).length :
						file.size
					,
					timestamp: await util.timestamp()
				}).sort(
					(a, b) => b.timestamp - a.timestamp
				)})
			))
		};
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
