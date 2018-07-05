import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {xkcdPassphrase} from 'xkcd-passphrase';
import {usernameMask} from '../../account';
import {emailPattern} from '../../email-pattern';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {uuid} from '../../util/uuid';
import {sleep} from '../../util/wait';


/**
 * Angular component for account register UI.
 */
@Component({
	selector: 'cyph-account-register',
	styleUrls: ['./account-register.component.scss'],
	templateUrl: './account-register.component.html'
})
export class AccountRegisterComponent implements OnInit {
	/** @ignore */
	private usernameDebounceLast?: string;

	/** Indicates whether registration attempt is in progress. */
	public checking: boolean							= false;

	/** Email addres. */
	public email: string								= '';

	/** @see emailPattern */
	public readonly emailPattern: typeof emailPattern	= emailPattern;

	/** Indicates whether the last registration attempt has failed. */
	public error: boolean								= false;

	/** If true, will display only the master key UI and output value upon submission. */
	@Input() public getMasterKeyOnly: boolean			= false;

	/** If true, will display only the lock screen password UI and output value upon submission. */
	@Input() public getPinOnly: boolean					= false;

	/** Password visibility settings. */
	public readonly hidePassword						= {
		lockScreen: true,
		lockScreenConfirm: true,
		masterKey: true,
		masterKeyConfirm: true
	};

	/** Invite code. */
	public inviteCode: string							= '';

	/** Lock screen password. */
	public lockScreenPassword: string					= '';

	/** Lock screen password confirmation. */
	public lockScreenPasswordConfirm: string			= '';

	/** Minimum length of lock screen PIN/password. */
	public lockScreenPasswordLength: number				= 4;

	/** Lock screen PIN. */
	public lockScreenPIN: string						= '';

	/** Master key (main account password). */
	public masterKey: string							= '';

	/** Master key confirmation. */
	public masterKeyConfirm: string						= '';

	/** Minimum length of custom master key. */
	public masterKeyLength: number						= 20;

	/** Name. */
	public name: string									= '';

	/** Sets a spoiler on generated master key. */
	public spoiler: boolean								= true;

	/**
	 * Master key submission.
	 * @see getMasterKeyOnly
	 */
	@Output() public readonly submitMasterKey: EventEmitter<string>	=
		new EventEmitter<string>()
	;

	/**
	 * Lock screen password submission.
	 * @see getPinOnly
	 */
	@Output() public readonly submitPIN: EventEmitter<{isCustom: boolean; value: string}>	=
		new EventEmitter<{isCustom: boolean; value: string}>()
	;

	/** Form tab index. */
	public tabIndex: number								= 3;

	/** Total number of steps/tabs. */
	public readonly totalSteps: number					= 4;

	/** Indicates whether or not lockScreenPIN should be used in place of lockScreenPassword. */
	public useLockScreenPIN: boolean					= true;

	/** Username. */
	public username: FormControl						= new FormControl('', undefined, [
		async control => {
			const value					= control.value;
			const id					= uuid();
			this.usernameDebounceLast	= id;

			return (await sleep(500).then(async () =>
				this.usernameDebounceLast === id ?
					this.accountUserLookupService.exists(value, false, false) :
					true
			)) ?
				{usernameTaken: {value}} :
				/* tslint:disable-next-line:no-null-keyword */
				null
			;
		}
	]);

	/** @see usernameMask */
	public readonly usernameMask: typeof usernameMask	= usernameMask;

	/** Indicates whether or not xkcdPassphrase should be used. */
	public useXkcdPassphrase: boolean					= true;

	/** Auto-generated password option. */
	public xkcdPassphrase: Promise<string>				= xkcdPassphrase.generate();

	/** Indicates whether xkcdPassphrase has been viewed. */
	public xkcdPassphraseHasBeenViewed: boolean			= false;

	/**
	 * Indicates whether the lock screen password is viable.
	 * TODO: Investigate hardening this against timing attacks.
	 */
	public get lockScreenPasswordReady () : boolean {
		return (
			this.useLockScreenPIN ?
				this.lockScreenPIN.length === this.lockScreenPasswordLength :
				(
					this.lockScreenPassword === this.lockScreenPasswordConfirm &&
					this.lockScreenPassword.length >= this.lockScreenPasswordLength
				)
		);
	}

	/**
	 * Indicates whether the master key is viable.
	 * TODO: Investigate hardening this against timing attacks.
	 */
	public get masterKeyReady () : boolean {
		return (
			this.useXkcdPassphrase ?
				this.xkcdPassphraseHasBeenViewed :
				(
					this.masterKey === this.masterKeyConfirm &&
					this.masterKey.length >= this.masterKeyLength
				)
		);
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();

		if (this.getMasterKeyOnly || this.getPinOnly) {
			return;
		}

		this.activatedRoute.params.subscribe(async o => {
			try {
				const step	= Number.parseInt(o.step, 10);

				/* Allow "step" parameter to double up as invite code */
				if (isNaN(step) && !this.inviteCode) {
					this.inviteCode	= o.step;
				}
				else if (!isNaN(step) && step > 0 && step <= (this.totalSteps + 1)) {
					this.tabIndex	= step - 1;
					return;
				}
			}
			catch {}

			this.router.navigate([accountRoot, 'register', '1']);
		});
	}

	/** Indicates whether we're ready to initiate a registration attempt. */
	public get readyToSubmit () : boolean {
		return !(
			!this.username.value ||
			this.username.errors ||
			!this.name ||
			!this.inviteCode ||
			!this.lockScreenPasswordReady ||
			!this.masterKeyReady
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
			this.email,
			this.inviteCode
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

		this.router.navigate([accountRoot, 'welcome']);
	}

	/** Updates route for consistency with tabIndex. */
	public updateRoute (increment: number = 0, tabIndex: number = this.tabIndex) : void {
		this.router.navigate([
			accountRoot,
			'register',
			(tabIndex + increment + 1).toString()
		]);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
