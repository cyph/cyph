import {Component, Input, OnInit} from '@angular/core';
import {AccountUserTypes, IAppointment} from '../../proto';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account call waiting UI.
 */
@Component({
	selector: 'cyph-account-call-waiting',
	styleUrls: ['./account-call-waiting.component.scss'],
	templateUrl: './account-call-waiting.component.html'
})
export class AccountCallWaitingComponent implements OnInit {
	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** @see AccountChatComponent */
	@Input() public appointment?: IAppointment;

	/** @see AccountChatComponent */
	@Input() public appointmentID?: string;

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
