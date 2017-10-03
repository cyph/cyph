import {Component} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account login UI.
 */
@Component({
	selector: 'cyph-account-login',
	styleUrls: ['../../../css/components/account-login.scss'],
	templateUrl: '../../../templates/account-login.html'
})
export class AccountLoginComponent {
	/** Indicates whether login attempt is in progress. */
	public checking: boolean	= false;

	/** Indicates whether the last login attempt has failed. */
	public error: boolean		= false;

	/** Password to be used for login attempt. */
	public password: string		= '';

	/** Username to be used for login attempt. */
	public username: string		= '';

	/** Initiates login attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;
		this.error		= false;
		this.error		= !(await this.accountAuthService.login(this.username, this.password));
		this.checking	= false;

		if (this.error) {
			return;
		}

		this.password	= '';
		this.username	= '';

		this.routerService.navigate(['account'].concat(
			this.activatedRouteService.snapshot.url.map(o => o.path)
		));
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly routerService: Router,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
