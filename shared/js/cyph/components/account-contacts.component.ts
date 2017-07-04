import {Component, Input} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {User, UserPresence} from '../account';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account contacts UI.
 */
@Component({
	selector: 'cyph-account-contacts',
	styleUrls: ['../../../css/components/account-contacts.scss'],
	templateUrl: '../../../templates/account-contacts.html'
})
export class AccountContactsComponent {
	/** Indicates whether this is contained within a sidebar. */
	@Input() public sidebar: boolean	= false;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** Indicates whether the chat UI is open for this user. */
	public isActive (contact: User) : boolean {
		const snapshot	= this.activatedRouteService.snapshot.firstChild ?
			this.activatedRouteService.snapshot.firstChild :
			this.activatedRouteService.snapshot
		;

		return contact.username === snapshot.params.username &&
			snapshot.url.map(o => o.path)[0] === 'chat'
		;
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
