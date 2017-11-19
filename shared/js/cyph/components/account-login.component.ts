import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {usernameMask} from '../account';
import {BinaryProto, BooleanProto, StringProto} from '../proto';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {PotassiumService} from '../services/crypto/potassium.service';
import {EnvService} from '../services/env.service';
import {LocalStorageService} from '../services/local-storage.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account login UI.
 */
@Component({
	selector: 'cyph-account-login',
	styleUrls: ['../../../css/components/account-login.scss'],
	templateUrl: '../../../templates/account-login.html'
})
export class AccountLoginComponent implements OnInit {
	/** @ignore */
	private savedPassword?: Uint8Array;

	/** Indicates whether login attempt is in progress. */
	public checking: boolean			= true;

	/** Indicates whether the last login attempt has failed. */
	public error: boolean				= false;

	/** Password visibility setting. */
	public hidePassword: boolean		= true;

	/** Password to be used for login attempt. */
	public password: string				= '';

	/** PIN to be used for login attempt. */
	public pin: string					= '';

	/** Indicates whether PIN is custom. */
	public pinIsCustom: boolean			= true;

	/** Indicates whether a PIN unlock using saved credentials will be performed. */
	public pinUnlock: boolean			= false;

	/** Username saved in local storage from previous login. */
	public savedUsername?: string;

	/** Username to be used for login attempt. */
	public username: string				= '';

	/** @see usernameMask */
	public readonly usernameMask: any	= usernameMask;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.pinIsCustom	=
			await this.localStorageService.getItem('pinIsCustom', BooleanProto).catch(() => true)
		;

		this.savedPassword	=
			await this.localStorageService.getItem('password', BinaryProto).catch(() => undefined)
		;

		this.savedUsername	=
			await this.localStorageService.getItem('username', StringProto).catch(() => undefined)
		;

		this.pinUnlock		= this.savedPassword !== undefined && this.savedUsername !== undefined;
	}

	/** Initiates login attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;
		this.error		= false;

		this.error		= !(await (this.pinUnlock && this.savedPassword && this.savedUsername ?
			this.accountAuthService.login(this.savedUsername, this.savedPassword, this.pin) :
			this.accountAuthService.login(this.username, this.password)
		));

		this.checking	= false;

		if (this.error) {
			return;
		}

		if (this.savedPassword) {
			this.potassiumService.clearMemory(this.savedPassword);
		}

		this.password		= '';
		this.pin			= '';
		this.savedPassword	= undefined;
		this.savedPassword	= undefined;
		this.username		= '';

		this.routerService.navigate(['account'].concat(
			this.activatedRouteService.snapshot.url.map(o => o.path)
		));
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly routerService: Router,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
