import {Component, Input, ViewChild} from '@angular/core';
import {AccountFileShare} from '../../account';
import {IResolvable} from '../../iresolvable';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';
import {readableByteLength} from '../../util/formatting';
import {AccountContactsSearchComponent} from '../account-contacts-search';


/**
 * Angular component for account file sharing UI.
 */
@Component({
	selector: 'cyph-account-file-sharing',
	styleUrls: ['./account-file-sharing.component.scss'],
	templateUrl: './account-file-sharing.component.html'
})
export class AccountFileSharingComponent {
	/** @see AccountContactsSearchComponent */
	@ViewChild(AccountContactsSearchComponent)
	public accountContactsSearch?: AccountContactsSearchComponent;

	/** Function to close dialog. */
	public closeFunction?: IResolvable<() => void>;

	/** @see AccountFileShare */
	@Input() public file?: AccountFileShare;

	/** @see readableByteLength */
	public readonly readableByteLength: typeof readableByteLength	= readableByteLength;

	/** Shares file. */
	public async share () : Promise<void> {
		const username	=
			this.accountContactsSearch &&
			this.accountContactsSearch.searchBar &&
			this.accountContactsSearch.searchBar.filter.value &&
			this.accountContactsSearch.searchBar.filter.value.username
		;

		if (!username) {
			return;
		}

		let file	= await this.file;
		if (typeof file === 'function') {
			file	= await file(username);
		}
		if (file === undefined) {
			return;
		}

		if ('data' in file) {
			await this.accountFilesService.upload(file.name, file.data, username);
		}
		else {
			await this.accountFilesService.shareFile(file.id, username);
		}

		if (this.closeFunction) {
			(await this.closeFunction.promise)();
		}
	}

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


AccountFilesService.accountFileSharingComponent.resolve(AccountFileSharingComponent);
