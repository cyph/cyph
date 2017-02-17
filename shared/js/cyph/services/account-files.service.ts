import {Injectable} from '@angular/core';
import {IFile} from '../files/ifile';
import {AccountAuthService} from './account-auth.service';


/**
 * @see Account contacts service.
 */
@Injectable()
export class AccountFilesService {
	/** @ignore */
	private static DUMMY_FILES: IFile[]	= [
		{name:'Test File', type: 'png', location: '/', size: 1337 }
	]

	public get myFiles () : IFile[] {
		if (!this.accountAuthService) {
			return [];
		}
		return AccountFilesService.DUMMY_FILES;
	}

	constructor (
		/** @ignore */
		private accountAuthService: AccountAuthService
	) {}
}
