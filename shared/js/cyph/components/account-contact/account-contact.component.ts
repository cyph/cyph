import {Component, Input, OnChanges} from '@angular/core';
import {User, UserPresence} from '../../account';
import {AccountUserTypes} from '../../proto';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account contact UI.
 */
@Component({
	selector: 'cyph-account-contact',
	styleUrls: ['./account-contact.component.scss'],
	templateUrl: './account-contact.component.html'
})
export class AccountContactComponent implements OnChanges {
	/** Indicates whether links should be enabled. */
	@Input() public clickable: boolean	= true;

	/** Contact. */
	@Input() public contact?: User;

	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		if (this.contact) {
			await this.contact.fetch();
		}
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
