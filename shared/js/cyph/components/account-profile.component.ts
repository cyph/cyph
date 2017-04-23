import {Component, Input, OnInit} from '@angular/core';
import {UserPresence, userPresenceSelectOptions} from '../account/enums';
import {User} from '../account/user';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {EnvService} from '../services/env.service';
import {UrlStateService} from '../services/url-state.service';


/**
 * Angular component for account profile UI.
 */
@Component({
	selector: 'cyph-account-profile',
	styleUrls: ['../../css/components/account-profile.css'],
	templateUrl: '../../templates/account-profile.html'
})
export class AccountProfileComponent implements OnInit {
	/** Username of profile owner. */
	@Input() private username?: string;

	/** @see UserPresence */
	public readonly statuses: typeof userPresenceSelectOptions	= userPresenceSelectOptions;

	/** User profile. */
	public user?: User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** Indicates whether this is the profile of the currently signed in user. */
	public get isCurrentUser () : boolean {
		return this.user === this.accountAuthService.current;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		await this.accountAuthService.ready;

		try {
			if (this.username) {
				this.user	= await this.accountUserLookupService.getUser(this.username);
			}
			else if (this.accountAuthService.current) {
				this.user	= this.accountAuthService.current;
			}
		}
		catch (_) {}

		if (!this.user) {
			this.urlStateService.setUrl('account/login');
		}
	}

	constructor (
		/** @ignore */
		private readonly urlStateService: UrlStateService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
