import {Component, Input, OnInit} from '@angular/core';
import {Profile} from '../account/profile';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountProfileService} from '../services/account-profile.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
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
	/** Username of profile owner. */
	@Input() public username: string|undefined;

	/** User profile. */
	public profile: Profile|undefined;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		try {
			this.profile	= await this.accountProfileService.getProfile(
				this.username ?
					await this.accountUserLookupService.getUser(this.username) :
					undefined
			);
		}
		catch (_) {
			if (!this.accountAuthService.user) {
				this.urlStateService.setUrl('/#account/login');
			}
		}
	}

	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountProfileService */
		public readonly accountProfileService: AccountProfileService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see AccountProfileService */
		public readonly urlStateService: UrlStateService
	) {}
}
