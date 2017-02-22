import {Injectable} from '@angular/core';
import {IFile} from '../files/ifile';
import {AccountAuthService} from './account-auth.service';


/**
 * @see Account file service.
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
		if (!this.accountAuthService.user) {
			return [];
		}

		return AccountFilesService.DUMMY_FILES;
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService
	) {}
}
