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
	private savedMasterKey?: Uint8Array;

	/** Indicates whether login attempt is in progress. */
	public checking: boolean			= false;

	/** Indicates whether the last login attempt has failed. */
	public error: boolean				= false;

	/** Password visibility setting. */
	public hidePassword: boolean		= true;

	/** Master key to be used for login attempt. */
	public masterKey: string			= '';

	/** PIN to be used for login attempt. */
	public pin: string					= '';

	/** Indicates whether PIN is custom. */
	public pinIsCustom: boolean			= true;

	/** Indicates whether a PIN unlock using saved credentials will be performed. */
	public pinUnlock?: boolean;

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

		this.savedMasterKey	=
			await this.localStorageService.getItem('masterKey', BinaryProto).catch(() => undefined)
		;

		this.savedUsername	=
			await this.localStorageService.getItem('username', StringProto).catch(() => undefined)
		;

		this.pinUnlock		= this.savedMasterKey !== undefined && this.savedUsername !== undefined;
	}

	/** Removes locally saved login credentials. */
	public async removeSavedCredentials () : Promise<void> {
		if (this.savedMasterKey) {
			this.potassiumService.clearMemory(this.savedMasterKey);
		}

		await this.localStorageService.removeItem('masterKey');
		await this.localStorageService.removeItem('pinIsCustom');
		await this.localStorageService.removeItem('username');

		this.pinIsCustom	= true;
		this.pinUnlock		= false;
		this.savedMasterKey	= undefined;
		this.savedMasterKey	= undefined;
	}

	/** Initiates login attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;
		this.error		= false;

		this.error		= !(await (this.pinUnlock && this.savedMasterKey && this.savedUsername ?
			this.accountAuthService.login(this.savedUsername, this.savedMasterKey, this.pin) :
			this.accountAuthService.login(this.username, this.masterKey)
		));

		this.checking	= false;

		if (this.error) {
			return;
		}

		if (this.savedMasterKey) {
			this.potassiumService.clearMemory(this.savedMasterKey);
		}

		this.masterKey		= '';
		this.pin			= '';
		this.pinIsCustom	= true;
		this.savedMasterKey	= undefined;
		this.savedMasterKey	= undefined;
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
