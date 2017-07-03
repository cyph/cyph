import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {IFileRecord} from '../files/ifile-record';
import {IAsyncValue} from '../iasync-value';
import {LockFunction} from '../lock-function-type';
import {util} from '../util';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';


/**
 * Account file service.
 */
@Injectable()
export class AccountFilesService {
	/** @ignore */
	private readonly filesObservable: Observable<IFileRecord[]|undefined>	=
		this.accountDatabaseService.watchItemObject<IFileRecord[]>('fileList')
	;

	/** @ignore */
	private readonly lock: LockFunction	=
		this.accountDatabaseService.lockFunction('accountFilesService')
	;

	/** @ignore */
	private readonly noteSnippets: Map<string, string>	= new Map<string, string>();

	/** List of file records owned by current user, sorted by timestamp in descending order. */
	public readonly files: IAsyncValue<IFileRecord[]>	=
		this.accountDatabaseService.getAsyncValueObject<IFileRecord[]>('fileList')
	;

	/**
	 * Files filtered by record type.
	 * @see files
	 */
	public readonly filteredFiles	= {
		files: this.filterFiles('file'),
		notes: this.filterFiles('note')
	};

	/** @ignore */
	private filterFiles (filterRecordType: 'file'|'note') : Observable<IFileRecord[]> {
		return this.filesObservable.map(files =>
			(files || []).filter(o => !filterRecordType || o.recordType === filterRecordType)
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
					await result,
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
		return this.accountDatabaseService.downloadItemString(`files/${id}`);
	}

	/** Downloads file and returns as data URI. */
	public downloadURI (id: string) : {
		progress: Observable<number>;
		result: Promise<string>;
	} {
		return this.accountDatabaseService.downloadItemURI(`files/${id}`);
	}

	/** Gets the specified file record. */
	public async getFile (id: string, filterRecordType?: 'file'|'note') : Promise<{
		file: IFileRecord;
		files: IFileRecord[];
	}> {
		const files	= await this.files.getValue();

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
		await this.getFile(id, 'note');
		await this.accountDatabaseService.setItem(`files/${id}`, content);

		await this.lock(async () => {
			const {file, files}	= await this.getFile(id, 'note');
			file.size			= this.potassiumService.fromString(content).length;
			file.timestamp		= await util.timestamp();

			this.files.setValue(files.sort((a, b) => b.timestamp - a.timestamp));
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
			result: result.then(async () => this.lock(async () =>
				this.files.setValue(
					(await this.files.getValue()).concat({
						id,
						mediaType: typeof file === 'string' ?
							'text/plain' :
							file.type
						,
						name,
						recordType: typeof file === 'string' ?
							'note' :
							'file'
						,
						size: typeof file === 'string' ?
							this.potassiumService.fromString(file).length :
							file.size
						,
						timestamp: await util.timestamp()
					}).sort(
						(a, b) => b.timestamp - a.timestamp
					)
				)
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
