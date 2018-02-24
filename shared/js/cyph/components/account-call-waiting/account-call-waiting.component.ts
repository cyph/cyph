import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
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
export class AccountCallWaitingComponent implements OnChanges, OnInit {
	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** @see AccountUserTypes */
	public readonly callTypes: typeof CallTypes	= CallTypes;

	/** @see AccountChatComponent */
	@Input() public appointment?: IAppointment&{id: string};

	/** Participants by type. */
	public readonly participantsByType: BehaviorSubject<Map<AccountUserTypes, User[]>>	=
		new BehaviorSubject(new Map())
	;

	/** @inheritDoc */
	public async ngOnChanges (changes: SimpleChanges) : Promise<void> {
		if (!('appointment' in changes)) {
			return;
		}

		const participantsByType	= new Map<AccountUserTypes, User[]>();

		try {
			if (
				!this.appointment ||
				!this.appointment.participants ||
				this.appointment.participants.length < 1
			) {
				return;
			}

			const users	= await Promise.all(this.appointment.participants.map(async username => {
				const user	= await this.accountUserLookupService.getUser(username);
				if (!user) {
					return user;
				}
				return {user, userType: (await user.accountUserProfile.getValue()).userType};
			}));

			for (const o of users) {
				if (!o) {
					continue;
				}

				const arr	= participantsByType.get(o.userType) || [];
				arr.push(o.user);
				participantsByType.set(o.userType, arr);
			}
		}
		finally {
			this.participantsByType.next(participantsByType);
		}
	}

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
