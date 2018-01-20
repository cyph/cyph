import {Component, OnInit} from '@angular/core';
import {AccountUserTypes} from '../proto';
import {AccountService} from '../services/account.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account call waiting UI.
 */
@Component({
	selector: 'cyph-account-call-waiting',
	styleUrls: ['../../../css/components/account-call-waiting.scss'],
	templateUrl: '../../../templates/account-call-waiting.html'
})
export class AccountCallWaitingComponent implements OnInit {
	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
