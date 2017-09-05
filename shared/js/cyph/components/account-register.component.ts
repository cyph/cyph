import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {xkcdPassphrase} from 'xkcd-passphrase';
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
	public checking: boolean				= false;

	/** Email addres. */
	public email: string					= '';

	/** Indicates whether the last registration attempt has failed. */
	public error: boolean					= false;

	/** Lock screen password. */
	public lockScreenPassword: string		= '';

	/** Lock screen timeout (# of days). */
	public lockScreenTimeout?: number		= 30;

	/** Name. */
	public name: string						= '';

	/** Password. */
	public password: string					= '';

	/** Password confirmation. */
	public passwordConfirmation: string		= '';

	/** Form tab index. */
	public tabIndex: number					= 0;

	/** Username. */
	public username: string					= '';

	/** Indicates whether or not xkcdPassphrase should be used. */
	public useXkcdPassphrase: boolean		= true;

	/** Auto-generated password option. */
	public xkcdPassphrase: Promise<string>	= xkcdPassphrase.generate();

	/** Goes to next section. */
	public next () : void {
		this.tabIndex	= Math.min(this.tabIndex + 1, 3);
	}

	/** Initiates registration attempt. */
	public async submit () : Promise<void> {
		if (!this.useXkcdPassphrase && this.password !== this.passwordConfirmation) {
			this.checking	= false;
			this.error		= true;
			return;
		}

		this.checking	= true;
		this.error		= false;
		this.error		= !(await this.accountAuthService.register(
			this.username,
			this.useXkcdPassphrase ? (await this.xkcdPassphrase) : this.password,
			this.name,
			this.email
		));
		this.checking	= false;

		if (this.error) {
			return;
		}

		this.email				= '';
		this.name				= '';
		this.password			= '';
		this.username			= '';
		this.useXkcdPassphrase	= false;
		this.xkcdPassphrase		= Promise.resolve('');

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
