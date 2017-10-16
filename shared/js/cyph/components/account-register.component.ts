import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
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
export class AccountRegisterComponent implements OnInit {
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
	public tabIndex: number					= 3;

	/** Total number of steps/tabs. */
	public readonly totalSteps: number		= 4;

	/** Username. */
	public username: string					= '';

	/** Indicates whether or not xkcdPassphrase should be used. */
	public useXkcdPassphrase: boolean		= true;

	/** Auto-generated password option. */
	public xkcdPassphrase: Promise<string>	= xkcdPassphrase.generate();

	/** @inheritDoc */
	public ngOnInit () : void {
		this.activatedRouteService.params.subscribe(async o => {
			try {
				const step: number|undefined	= parseInt(o.step, 10);

				if (!isNaN(step) && step > 0 && step <= (this.totalSteps + 1)) {
					this.tabIndex	= step - 1;
					return;
				}
			}
			catch {}

			this.routerService.navigate(['account', 'register', '1']);
		});
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

	/** Updates route for consistency with tabIndex. */
	public updateRoute (increment: number = 0, tabIndex: number = this.tabIndex) : void {
		this.routerService.navigate([
			'account',
			'register',
			(tabIndex + increment + 1).toString()
		]);
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
