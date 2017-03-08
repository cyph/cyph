import {Injectable} from '@angular/core';
import {IFile} from '../files/ifile';
import {AccountAuthService} from './account-auth.service';


/**
 * Account file service.
 */
@Injectable()
export class AccountFilesService {
	/** @ignore */
	private static DUMMY_FILES: IFile[]	= [
		{name: 'Some Image', filetype: 'png', location: '/', size: 1337},
		{name: 'Some Archive', filetype: '7zip', location: '/', size: 1337},
		{name: 'Some Video', filetype: 'mp4', location: '/', size: 1337},
		{name: 'Test File', filetype: 'png', location: '/', size: 1337},
		{name: 'Test File', filetype: 'png', location: '/', size: 1337}
	];

	/** Files owned by current user. */
	public get myFiles () : IFile[] {
		if (!this.accountAuthService.current) {
			return [];
		}

		return AccountFilesService.DUMMY_FILES;
	}

	/** Gets the Material icon name for the file default thumbnail. */
	public thumb (filetype: string) : 'insert_drive_file'|'movie'|'photo' {
		const images: string[]	= ['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'gif', 'eps', 'ai'];
		const videos: string[]	= ['mov', 'mp4', 'avi', 'mpeg'];

		for (const image of images) {
			if (filetype === image) {
				return 'photo';
			}
		}

		for (const video of videos) {
			if (filetype === video) {
				return 'movie';
			}
		}

		return 'insert_drive_file';
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService
	) {}
}
