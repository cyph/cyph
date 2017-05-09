import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {UserPresence, userPresenceSelectOptions} from '../account/enums';
import {User} from '../account/user';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
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
			else if (this.accountAuthService.current) {
				this.user	= this.accountAuthService.current;
			}
		}
		catch (_) {}

		if (!this.user) {
			this.routerService.navigate(['account', 'login']);
		}
	}

	/** Indicates whether this is the profile of the currently signed in user. */
	public get isCurrentUser () : boolean {
		return this.user === this.accountAuthService.current;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		await this.accountAuthService.ready;
		this.setUser(this.activatedRouteService.snapshot.params.username);
		this.activatedRouteService.params.subscribe(o => { this.setUser(o.username); });
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly routerService: Router,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
