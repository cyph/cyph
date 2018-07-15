import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {usernameMask} from '../../account';
import {BinaryProto, BooleanProto, StringProto} from '../../proto';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {PotassiumService} from '../../services/crypto/potassium.service';
import {EnvService} from '../../services/env.service';
import {LocalStorageService} from '../../services/local-storage.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account login UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-login',
	styleUrls: ['./account-login.component.scss'],
	templateUrl: './account-login.component.html'
})
export class AccountLoginComponent implements OnInit {
	/** @ignore */
	private readonly savedMasterKey		= new BehaviorSubject<Uint8Array|undefined>(undefined);

	/** Indicates whether login attempt is in progress. */
	public readonly checking			= new BehaviorSubject<boolean>(true);

	/** Indicates whether the last login attempt has failed. */
	public readonly error				= new BehaviorSubject<boolean>(false);

	/** Password visibility setting. */
	public readonly hidePassword		= new BehaviorSubject<boolean>(true);

	/** Master key to be used for login attempt. */
	public readonly masterKey			= new BehaviorSubject<string>('');

	/** PIN to be used for login attempt. */
	public readonly pin					= new BehaviorSubject<string>('');

	/** Indicates whether PIN is custom. */
	public readonly pinIsCustom			= new BehaviorSubject<boolean>(true);

	/** Indicates whether a PIN unlock using saved credentials will be performed. */
	public readonly pinUnlock			= new BehaviorSubject<boolean>(false);

	/** Username saved in local storage from previous login. */
	public readonly savedUsername		= new BehaviorSubject<string|undefined>(undefined);

	/** Username to be used for login attempt. */
	public readonly username			= new BehaviorSubject<string>('');

	/** @see usernameMask */
	public readonly usernameMask: any	= usernameMask;

	/** @ignore */
	private async postLogin () : Promise<void> {
		if (this.savedMasterKey.value) {
			this.potassiumService.clearMemory(this.savedMasterKey.value);
		}

		this.masterKey.next('');
		this.pin.next('');
		this.pinIsCustom.next(true);
		this.savedMasterKey.next(undefined);
		this.savedUsername.next(undefined);
		this.username.next('');

		await this.router.navigate(
			this.activatedRoute.snapshot.url.length > 0 ?
				this.activatedRoute.snapshot.url.map(o => o.path) :
				[accountRoot]
		);
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (
			this.accountDatabaseService.currentUser.value &&
			this.accountDatabaseService.currentUser.value.user
		) {
			return this.postLogin();
		}

		try {
			const [pinIsCustom, savedMasterKey, savedUsername]	= await Promise.all([
				this.localStorageService.getItem('pinIsCustom', BooleanProto).catch(() => true),
				this.localStorageService.getItem('masterKey', BinaryProto).catch(() => undefined),
				this.localStorageService.getItem('username', StringProto).catch(() => undefined)
			]);

			this.pinIsCustom.next(pinIsCustom);
			this.savedMasterKey.next(savedMasterKey);
			this.savedUsername.next(savedUsername);

			if (!(savedMasterKey && savedUsername)) {
				return;
			}

			this.pinUnlock.next(true);

			const savedPIN	= await this.accountAuthService.getSavedPIN();

			if (
				savedPIN &&
				(await this.accountAuthService.login(savedUsername, savedMasterKey, savedPIN))
			) {
				this.potassiumService.clearMemory(savedPIN);
				await this.postLogin();
			}
		}
		finally {
			this.checking.next(false);
			this.accountService.resolveUiReady();
		}
	}

	/** Removes locally saved login credentials. */
	public async removeSavedCredentials () : Promise<void> {
		if (this.savedMasterKey.value) {
			this.potassiumService.clearMemory(this.savedMasterKey.value);
		}

		await this.accountAuthService.removeSavedCredentials();

		this.pinIsCustom.next(true);
		this.pinUnlock.next(false);
		this.savedMasterKey.next(undefined);
		this.savedUsername.next(undefined);
	}

	/** Initiates login attempt. */
	public async submit () : Promise<void> {
		this.checking.next(true);
		this.error.next(false);

		this.error.next(!(await (
			this.pinUnlock.value && this.savedMasterKey.value && this.savedUsername.value ?
				this.accountAuthService.login(
					this.savedUsername.value,
					this.savedMasterKey.value,
					this.pin.value
				) :
				this.accountAuthService.login(
					this.username.value,
					this.masterKey.value
				)
		)));

		this.checking.next(false);

		if (this.error.value) {
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
		private readonly accountDatabaseService: AccountDatabaseService,

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
	) {
		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof document === 'object' && typeof document.body === 'object') {
			document.body.classList.remove('primary-account-theme');
		}
	}
}
