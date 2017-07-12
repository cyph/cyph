import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {UserPresence, userPresenceSelectOptions} from '../account/enums';
import {User} from '../account/user';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for account profile UI.
 */
@Component({
	selector: 'cyph-account-profile',
	styleUrls: ['../../../css/components/account-profile.scss'],
	templateUrl: '../../../templates/account-profile.html'
})
export class AccountProfileComponent implements OnInit {
	/** @see UserPresence */
	public readonly statuses: typeof userPresenceSelectOptions	= userPresenceSelectOptions;

	/** User profile. */
	public user?: User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @ignore */
	private async setUser (username?: string) : Promise<void> {
		try {
			if (username) {
				this.user	= await this.accountUserLookupService.getUser(username);
			}
			else if (this.accountDatabaseService.currentUser.value) {
				this.user	= this.accountDatabaseService.currentUser.value.user;
			}
		}
		catch (_) {}

		if (!this.user) {
			this.routerService.navigate(['account', 'login']);
		}
	}

	/** Indicates whether this is the profile of the currently signed in user. */
	public get isCurrentUser () : boolean {
		return (
			this.accountDatabaseService.currentUser.value !== undefined &&
			this.user === this.accountDatabaseService.currentUser.value.user
		);
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.activatedRouteService.params.subscribe(o => { this.setUser(o.username); });
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly routerService: Router,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
