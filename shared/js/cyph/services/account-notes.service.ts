import {Injectable} from '@angular/core';
import {INote} from '../notes/inote';
import {AccountAuthService} from './account-auth.service';


/**
 * Account notes service.
 */
@Injectable()
export class AccountNotesService {
	/** @ignore */
	private static DUMMY_NOTES: INote[]	= [
		{title: 'Note Title', contents: 'Note Contents'}
	];

	/** Files owned by current user. */
	public get myNotes () : INote[] {
		if (!this.accountAuthService.current) {
			return [];
		}

		return AccountNotesService.DUMMY_NOTES;
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService
	) {}
}
