import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {usernameMask} from '../../account';
import {BinaryProto, BooleanProto, StringProto} from '../../proto';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {PotassiumService} from '../../services/crypto/potassium.service';
import {EnvService} from '../../services/env.service';
import {LocalStorageService} from '../../services/local-storage.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account login UI.
 */
@Component({
	selector: 'cyph-account-login',
	styleUrls: ['./account-login.component.scss'],
	templateUrl: './account-login.component.html'
})
export class AccountLoginComponent implements OnInit {
	/** @ignore */
	private savedMasterKey?: Uint8Array;

	/** Indicates whether login attempt is in progress. */
	public checking: boolean			= true;

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
	public pinUnlock: boolean			= false;

	/** Username saved in local storage from previous login. */
	public savedUsername?: string;

	/** Username to be used for login attempt. */
	public username: string				= '';

	/** @see usernameMask */
	public readonly usernameMask: any	= usernameMask;

	/** @ignore */
	private async postLogin () : Promise<void> {
		if (this.savedMasterKey) {
			this.potassiumService.clearMemory(this.savedMasterKey);
		}

		this.masterKey		= '';
		this.pin			= '';
		this.pinIsCustom	= true;
		this.savedMasterKey	= undefined;
		this.savedMasterKey	= undefined;
		this.username		= '';

		await this.router.navigate(
			this.activatedRoute.snapshot.url.length > 0 ?
				this.activatedRoute.snapshot.url.map(o => o.path) :
				[accountRoot]
		);
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		try {
			this.pinIsCustom	= await this.localStorageService.getItem(
				'pinIsCustom',
				BooleanProto
			).catch(
				() => true
			);

			this.savedMasterKey	= await this.localStorageService.getItem(
				'masterKey',
				BinaryProto
			).catch(
				() => undefined
			);

			this.savedUsername	= await this.localStorageService.getItem(
				'username',
				StringProto
			).catch(
				() => undefined
			);

			if (!(this.savedMasterKey && this.savedUsername)) {
				return;
			}

			this.pinUnlock	= true;

			const savedPIN	= await this.accountAuthService.getSavedPIN();

			if (
				savedPIN &&
				await this.accountAuthService.login(
					this.savedUsername,
					this.savedMasterKey,
					savedPIN
				)
			) {
				this.potassiumService.clearMemory(savedPIN);
				await this.postLogin();
			}
		}
		finally {
			this.checking	= false;
			this.accountService.resolveUiReady();
		}
	}

	/** Removes locally saved login credentials. */
	public async removeSavedCredentials () : Promise<void> {
		if (this.savedMasterKey) {
			this.potassiumService.clearMemory(this.savedMasterKey);
		}

		await this.accountAuthService.removeSavedCredentials();

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

		await this.postLogin();
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

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
