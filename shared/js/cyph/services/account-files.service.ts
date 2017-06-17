import {Injectable} from '@angular/core';
import {IFileRecord} from '../files/ifile-record';
import {util} from '../util';
import {AccountDatabaseService} from './account-database.service';
import {PotassiumService} from './crypto/potassium.service';


/**
 * Account file service.
 */
@Injectable()
export class AccountFilesService {
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
	public async getFile (
		id: string,
		filterRecordType?: 'file'|'note',
		files?: IFileRecord[]
	) : Promise<IFileRecord> {
		if (!files) {
			files	= await this.getFiles();
		}

		const file	= files.find(o =>
			o.id === id &&
			(!filterRecordType || o.recordType === filterRecordType)
		);

		if (!file) {
			throw new Error('Specified file does not exist.');
		}

		return file;
	}

	/**
	 * Gets list of file records owned by current user,
	 * sorted by timestamp in descending order.
	 */
	public async getFiles (filterRecordType?: 'file'|'note') : Promise<IFileRecord[]> {
		if (!this.accountDatabaseService.current) {
			return [];
		}

		return (
			await this.accountDatabaseService.getItemObject<IFileRecord[]>(
				'fileList',
				false,
				true
			)
		).filter(
			o => !filterRecordType || o.recordType === filterRecordType
		).sort(
			(a, b) => b.timestamp - a.timestamp
		);
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
	public async noteSnippet (id: string, limit: number) : Promise<string> {
		const content	= await this.downloadText(id);
		return (content.length > limit) ? `${content.substr(0, (limit - 1))}...` : content;
	}

	/** Overwrites an existing note. */
	public async updateNote (id: string, content: string) : Promise<void> {
		const files	= await this.getFiles();
		const file	= await this.getFile(id, 'note', files);

		await this.accountDatabaseService.setItem(`files/${id}`, content, false, true);

		file.size		= this.potassiumService.fromString(content).length;
		file.timestamp	= await util.timestamp();

		await this.accountDatabaseService.setItem('fileList', files, false, true);
	}

	/** Uploads new file. */
	public async upload (name: string, file: string|File) : Promise<void> {
		const id	= util.uuid();

		await this.accountDatabaseService.setItem(`files/${id}`, file, false, true);

		await this.accountDatabaseService.setItem(
			'fileList',
			(await this.getFiles()).concat({
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
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
