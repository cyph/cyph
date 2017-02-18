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
		{name: 'Test File', filetype: 'png', location: '/', size: 1337}
	];

	public get myFiles () : IFile[] {
		if (!this.accountAuthService.authenticated) {
			return [];
		}

		return AccountFilesService.DUMMY_FILES;
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService
	) {}
}
