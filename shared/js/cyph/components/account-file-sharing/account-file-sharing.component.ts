import {Component, Input, ViewChild} from '@angular/core';
import {AccountContactsSearchComponent} from '../account-contacts-search';
import {IAccountFileRecord} from '../../proto';
import {User} from '../../account/user';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';
import {readableByteLength} from '../../util/formatting';



/**
 * Angular component for account file sharing UI.
 */
@Component({
	selector: 'cyph-account-file-sharing',
	styleUrls: ['./account-file-sharing.component.scss'],
	templateUrl: './account-file-sharing.component.html'
})
export class AccountFileSharingComponent {
	@Input() public file?: IAccountFileRecord;
	
	/** @see readableByteLength */
	public readonly readableByteLength: typeof readableByteLength	= readableByteLength;

	public async share(fileID: string, username?: string): Promise<void> {
		if (this.accountContactsSearch && this.accountContactsSearch.searchBar) {
			if (!username){
				username = this.accountContactsSearch.searchBar.filter.value.username;
			}
			if(!username) { return }
			await this.accountFilesService.shareFile(
				fileID,
				username
			);
		}
	}

	/** @see AccountContactsSearchComponent */
	@ViewChild(AccountContactsSearchComponent)
	public accountContactsSearch?: AccountContactsSearchComponent;

	@Input() public user?: User;

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
