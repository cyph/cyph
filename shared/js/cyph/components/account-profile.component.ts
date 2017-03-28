import {Component, Input, OnInit} from '@angular/core';
import {UserPresence, userPresenceSelectOptions} from '../account/enums';
import {Profile} from '../account/profile';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountProfileService} from '../services/account-profile.service';
import {EnvService} from '../services/env.service';
import {UrlStateService} from '../services/url-state.service';


/**
 * Angular component for account profile UI.
 */
@Component({
	selector: 'cyph-account-profile',
	styleUrls: ['../../css/components/account-profile.css'],
	templateUrl: '../../../templates/account-profile.html'
})
export class AccountProfileComponent implements OnInit {
	/** User profile. */
	public profile?: Profile;

	/** @see UserPresence */
	public readonly statuses: typeof userPresenceSelectOptions	= userPresenceSelectOptions;

	/** Username of profile owner. */
	@Input() public username?: string;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** Indicates whether this is the profile of the currently signed in user. */
	public get isCurrentUser () : boolean {
		return this.profile === this.accountAuthService.current;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		await this.accountAuthService.ready;

		try {
			this.profile	= await this.accountProfileService.getProfile(this.username);
		}
		catch (_) {}

		if (!this.profile) {
			this.urlStateService.setUrl('account/login');
		}
	}

	constructor (
		/** @ignore */
		private readonly urlStateService: UrlStateService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountProfileService */
		public readonly accountProfileService: AccountProfileService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
