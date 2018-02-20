import {Component, Input, OnInit} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {User} from '../../account/user';
import {AccountUserTypes, CallTypes, IAppointment} from '../../proto';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
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

	/** @see AccountUserTypes */
	public readonly callTypes: typeof CallTypes	= CallTypes;

	/** @see AccountChatComponent */
	@Input() public appointment?: IAppointment;

	/** @see AccountChatComponent */
	@Input() public appointmentID?: string;

	/** Gets user. */
	public readonly getUser: (username: string) => Promise<User|undefined>	=
	memoize(async (username: string) =>
		this.accountUserLookupService.getUser(username)
	);

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,


		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
