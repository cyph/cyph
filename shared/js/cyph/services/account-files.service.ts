import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {IFileRecord} from '../files/ifile-record';
import {util} from '../util';
import {AccountAuthService} from './account-auth.service';
import {AccountDatabaseService} from './account-database.service';
import {PotassiumService} from './crypto/potassium.service';


/**
 * Account file service.
 */
@Injectable()
export class AccountFilesService {
	/** @ignore */
	private readonly lock: {}	= {};

	/** @ignore */
	private readonly noteSnippets: Map<string, string>		= new Map<string, string>();

	/** List of file records owned by current user, sorted by timestamp in descending order. */
	public readonly files: BehaviorSubject<IFileRecord[]>	= new BehaviorSubject([]);

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
		return this.files.map(files =>
			files.filter(o => !filterRecordType || o.recordType === filterRecordType)
		);
	}

	/**
	 * For now, only run within util.lock.
	 * TODO: Account-wide locking, or other more robust solution.
	 */
	private async updateFiles () : Promise<void> {
		if (!this.accountDatabaseService.current) {
			return;
		}

		this.files.next((
			await this.accountDatabaseService.getItemObject<IFileRecord[]>(
				'fileList',
				false,
				true
			)
		).sort(
			(a, b) => b.timestamp - a.timestamp
		));
	}

	/** Downloads and saves file. */
	public async downloadAndSave (id: string) : Promise<void> {
		const file	= await this.getFile(id);

		await util.saveFile(
			await this.accountDatabaseService.getItem(`files/${id}`, false, true),
			file.name
		);
	}

	/** Downloads file and returns text. */
	public async downloadText (id: string) : Promise<string> {
		return this.accountDatabaseService.getItemString(`files/${id}`, false, true);
	}

	/** Downloads file and returns as data URI. */
	public async downloadURI (id: string) : Promise<string> {
		return this.accountDatabaseService.getItemURI(`files/${id}`, false, true);
	}

	/** Gets the specified file record. */
	public async getFile (id: string, filterRecordType?: 'file'|'note') : Promise<IFileRecord> {
		const file	= this.files.value.find(o =>
			o.id === id &&
			(!filterRecordType || o.recordType === filterRecordType)
		);

		if (!file) {
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
			(async () => {
				const limit		= 75;
				const content	= await this.downloadText(id);

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
		await util.lock(this.lock, async () => {
			await this.updateFiles();

			const file	= await this.getFile(id, 'note');

			await this.accountDatabaseService.setItem(`files/${id}`, content, false, true);

			file.size		= this.potassiumService.fromString(content).length;
			file.timestamp	= await util.timestamp();

			await this.accountDatabaseService.setItem('fileList', this.files.value, false, true);

			await this.updateFiles();
		});
	}

	/** Uploads new file. */
	public async upload (name: string, file: string|File) : Promise<void> {
		const id	= util.uuid();

		await util.lock(this.lock, async () => {
			await this.accountDatabaseService.setItem(`files/${id}`, file, false, true);

			await this.accountDatabaseService.setItem(
				'fileList',
				(this.files.value).concat({
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
				}),
				false,
				true
			);

			await this.updateFiles();
		});
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		util.lock(this.lock, async () => this.updateFiles());
		this.accountAuthService.onLogin.subscribe(() => {
			util.lock(this.lock, async () => this.updateFiles());
		});
	}
}
