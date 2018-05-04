import {Component, Input, OnChanges} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {IContactListItem, User, UserPresence} from '../../account';
import {AccountUserTypes} from '../../proto';
import {AccountOrganizationsService} from '../../services/account-organizations.service';
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

	/** Gets user org. */
	public readonly getUserOrg: (username: string) => Promise<User|undefined>	=
		memoize(async (username: string) =>
			this.accountOrganizationsService.getOrganization(username)
		)
	;

	/** This user. */
	public readonly user: BehaviorSubject<User|undefined>	=
		new BehaviorSubject<User|undefined>(undefined)
	;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence		= UserPresence;

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		const user	= !this.contact || this.contact instanceof User ?
			this.contact :
			await this.contact.user
		;

		this.user.next(user);

		if (user) {
			await user.fetch();
		}
	}

	/** This user's username. */
	public get username () : string|undefined {
		return this.contact ? this.contact.username : undefined;
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountOrganizationsService */
		public readonly accountOrganizationsService: AccountOrganizationsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
