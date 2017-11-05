import {Component, OnInit} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import * as $ from 'jquery';
import {xkcdPassphrase} from 'xkcd-passphrase';
import {pinMask, usernameMask} from '../account';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
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
	/** @ignore */
	private lockScreenPINInternal: string				= '';

	/** Indicates whether registration attempt is in progress. */
	public checking: boolean							= false;

	/** Email addres. */
	public email: string								= '';

	/** Indicates whether the last registration attempt has failed. */
	public error: boolean								= false;

	/** Password visibility settings. */
	public readonly hidePassword						= {
		lockScreen: true,
		lockScreenConfirm: true,
		masterKey: true,
		masterKeyConfirm: true
	};

	/** Lock screen password. */
	public lockScreenPassword: string					= '';

	/** Lock screen password confirmation. */
	public lockScreenPasswordConfirm: string			= '';

	/** Minimum length of lock screen PIN/password. */
	public lockScreenPasswordLength: number				= 4;

	/** Master key (main account password). */
	public masterKey: string							= '';

	/** Master key confirmation. */
	public masterKeyConfirm: string						= '';

	/** Minimum length of custom master key. */
	public masterKeyLength: number						= 20;

	/** Name. */
	public name: string									= '';

	/** @see pinMask */
	public readonly pinMask: typeof pinMask				= pinMask;

	/** Form tab index. */
	public tabIndex: number								= 3;

	/** Total number of steps/tabs. */
	public readonly totalSteps: number					= 4;

	/** Indicates whether or not lockScreenPIN should be used in place of lockScreenPassword. */
	public useLockScreenPIN: boolean					= true;

	/** Username. */
	public username: FormControl						= new FormControl('', undefined, [
		async control =>
			await this.accountUserLookupService.exists(control.value, false) ?
				{usernameTaken: {value: control.value}} :
				/* tslint:disable-next-line:no-null-keyword */
				null
	]);

	/** @see usernameMask */
	public readonly usernameMask: typeof usernameMask	= usernameMask;

	/** Indicates whether or not xkcdPassphrase should be used. */
	public useXkcdPassphrase: boolean					= true;

	/** Auto-generated password option. */
	public xkcdPassphrase: Promise<string>				= xkcdPassphrase.generate();

	/** Focuses PIN input. */
	public async focusPIN (e: MouseEvent) : Promise<void> {
		/* x3 to account for spaces in pinMask */
		const index	= this.lockScreenPIN.length * 3;

		const $elem	= $(e.target).find('input');
		const elem	= <HTMLInputElement> $elem[0];

		$elem.focus();
		elem.setSelectionRange(index, index);
	}

	/** Lock screen PIN. */
	public get lockScreenPIN () : string {
		return this.lockScreenPINInternal.replace(/[^\d]/g, '');
	}

	public set lockScreenPIN (value: string) {
		this.lockScreenPINInternal	= value;
	}

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
			catch (_) {}

			this.routerService.navigate(['account', 'register', '1']);
		});
	}

	/** Indicates whether we're ready to initiate a registration attempt. */
	public get readyToSubmit () : boolean {
		return !(
			!this.username.value ||
			this.username.errors ||
			!this.name ||
			(
				this.useLockScreenPIN ?
					this.lockScreenPIN.length !== this.lockScreenPasswordLength :
					(
						this.lockScreenPassword !== this.lockScreenPasswordConfirm ||
						this.lockScreenPassword.length < this.lockScreenPasswordLength
					)
			) ||
			(
				!this.useXkcdPassphrase && (
					this.masterKey !== this.masterKeyConfirm ||
					this.masterKey.length < this.masterKeyLength
				)
			)
		);
	}

	/** Initiates registration attempt. */
	public async submit () : Promise<void> {
		if (!this.readyToSubmit) {
			this.checking	= false;
			this.error		= true;
			return;
		}

		this.checking	= true;
		this.error		= false;
		this.error		= !(await this.accountAuthService.register(
			this.username.value,
			this.useXkcdPassphrase ? (await this.xkcdPassphrase) : this.masterKey,
			{
				isCustom: !this.useLockScreenPIN,
				value: this.useLockScreenPIN ? this.lockScreenPIN : this.lockScreenPassword
			},
			this.name,
			this.email
		));
		this.checking	= false;

		if (this.error) {
			return;
		}

		this.email						= '';
		this.lockScreenPassword			= '';
		this.lockScreenPasswordConfirm	= '';
		this.lockScreenPIN				= '';
		this.masterKey					= '';
		this.masterKeyConfirm			= '';
		this.name						= '';
		this.username.setValue('');
		this.useLockScreenPIN			= false;
		this.useXkcdPassphrase			= false;
		this.xkcdPassphrase				= Promise.resolve('');

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

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
