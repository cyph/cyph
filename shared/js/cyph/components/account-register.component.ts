import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account register UI.
 */
@Component({
	selector: 'cyph-account-register',
	styleUrls: ['../../../css/components/account-register.scss'],
	templateUrl: '../../../templates/account-register.html'
})
export class AccountRegisterComponent {
	/** Indicates whether registration attempt is in progress. */
	public checking: boolean			= false;

	/** Email addres to be used for registration attempt. */
	public email: string				= '';

	/** Indicates whether the last registration attempt has failed. */
	public error: boolean				= false;

	/** Lock screen password to be used for registration attempt. */
	public lockScreenPassword: string	= '';

	/** Name to be used for registration attempt. */
	public name: string					= '';

	/** Password to be used for registration attempt. */
	public password: string				= '';

	/** Username to be used for registration attempt. */
	public username: string				= '';

	/** Initiates registration attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;
		this.error		= false;
		this.error		= !(await this.accountAuthService.register(
			this.username,
			this.password,
			this.name,
			this.email
		));
		this.checking	= false;

		if (this.error) {
			return;
		}

		this.email		= '';
		this.name		= '';
		this.password	= '';
		this.username	= '';

		this.routerService.navigate(['account', 'welcome']);
	}

	constructor (
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
