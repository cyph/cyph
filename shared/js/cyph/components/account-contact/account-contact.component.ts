import {Component, Input, OnChanges} from '@angular/core';
import {IContactListItem, User, UserPresence} from '../../account';
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
	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** Indicates whether links should be enabled. */
	@Input() public clickable: boolean	= true;

	/** Contact. */
	@Input() public contact?: IContactListItem|User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		const user	= await this.user;
		if (user) {
			await user.fetch();
		}
	}

	/** This user. */
	public get user () : Promise<User|undefined> {
		return !this.contact || this.contact instanceof User ?
			Promise.resolve(this.contact) :
			this.contact.user
		;
	}

	/** This user's username. */
	public get username () : string|undefined {
		return this.contact ? this.contact.username : undefined;
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
