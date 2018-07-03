import {Component, Input, ViewChild} from '@angular/core';
import memoize from 'lodash-es/memoize';
import once from 'lodash-es/once';
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

	/** Gets file. */
	public readonly getFile	= memoize(async (username: string = '') => {
		let file	= await this.file;

		if (typeof file === 'function') {
			file	= await file(username);
		}
		if (file === undefined) {
			return {file: undefined, fileConfig: undefined};
		}

		const fileConfig	= this.accountFilesService.config[
			'recordType' in file ?
				file.recordType :
				this.accountFilesService.getFileType(file.data)
		];

		return {
			file,
			fileConfig,
			mediaType: fileConfig.mediaType || (file instanceof Blob ? file.type : ''),
			size: 'size' in file ?
				file.size :
				await this.accountFilesService.getFileSize(file.data, fileConfig)
		};
	});

	/** @see isNaN */
	public readonly isNaN: typeof isNaN								= isNaN;

	/** @see readableByteLength */
	public readonly readableByteLength: typeof readableByteLength	= readableByteLength;

	/** Shares file. */
	public readonly share	= once(async () =>
		Promise.all(this.usernames.map(async username => {
			const {file}	= await this.getFile(username);
			if (file === undefined) {
				return;
			}

			if ('data' in file) {
				await this.accountFilesService.upload(
					file.name,
					file.data,
					username,
					file.metadata
				);
			}
			else {
				await this.accountFilesService.shareFile(file.id, username);
			}

			if (this.closeFunction) {
				(await this.closeFunction.promise)();
			}
		}))
	);

	/** Usernames to share with. */
	public get usernames () : string[] {
		return Array.from(
			(
				this.accountContactsSearch &&
				this.accountContactsSearch.searchBar &&
				this.accountContactsSearch.searchBar.filter.value
			) || []
		).map(o =>
			o.username
		);
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
