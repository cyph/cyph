import {Component, OnInit} from '@angular/core';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';
import {readableByteLength} from '../../util/formatting';


/**
 * Angular component for files UI.
 */
@Component({
	selector: 'cyph-account-files',
	styleUrls: ['./account-files.component.scss'],
	templateUrl: './account-files.component.html'
})
export class AccountFilesComponent implements OnInit {
	/** @see readableByteLength */
	public readonly readableByteLength: typeof readableByteLength	= readableByteLength;

	/** @see trackByID */
	public readonly trackByID: typeof trackByID	= trackByID;

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see DialogService */
		public readonly dialogService: DialogService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
