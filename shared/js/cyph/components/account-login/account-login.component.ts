import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	ViewChild
} from '@angular/core';
import {MatInput} from '@angular/material/input';
import {ActivatedRoute, Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {usernameMask} from '../../account';
import {BaseProvider} from '../../base-provider';
import {BinaryProto, BooleanProto, StringProto} from '../../proto';
import {AccountEnvService} from '../../services/account-env.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {PotassiumService} from '../../services/crypto/potassium.service';
import {EnvService} from '../../services/env.service';
import {LocalStorageService} from '../../services/local-storage.service';
import {StringsService} from '../../services/strings.service';
import {observableAll} from '../../util/observable-all';

/**
 * Angular component for account login UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: EnvService,
			useClass: AccountEnvService
		}
	],
	selector: 'cyph-account-login',
	styleUrls: ['./account-login.component.scss'],
	templateUrl: './account-login.component.html'
})
export class AccountLoginComponent extends BaseProvider implements OnInit {
	/** @ignore */
	private readonly savedMasterKey = new BehaviorSubject<
		Uint8Array | undefined
	>(undefined);

	/** If true, login via activation code failed. */
	public readonly activationCodeFailed = new BehaviorSubject<boolean>(false);

	/** Indicates whether activation code UI section is open. */
	public readonly activationCodeSectionOpen: Observable<boolean>;

	/** Indicates whether saved master key is the alternate master key. */
	public readonly altMasterKey = new BehaviorSubject<boolean>(false);

	/** Indicates whether login attempt is in progress. */
	public readonly checking = new BehaviorSubject<boolean>(true);

	/** Indicates whether the last login attempt has failed. */
	public readonly error = new BehaviorSubject<boolean>(false);

	/** Memoized AccountAuthService.hasSavedCredentials. */
	public readonly hasSavedCredentials = memoize(async () =>
		this.accountAuthService.hasSavedCredentials()
	);

	/** Password visibility setting. */
	public readonly hidePassword = new BehaviorSubject<boolean>(true);

	/** Indicates whether user has chosen to log in. */
	public readonly loggingIn: Observable<boolean>;

	/** Master key to be used for login attempt. */
	public readonly masterKey = new BehaviorSubject<string>('');

	/** @see ICurrentUser.masterKeyConfirmed */
	public readonly masterKeyConfirmed = this.localStorageService
		.hasItem('unconfirmedMasterKey', true)
		.then(b => !b);

	/** Master key input element. */
	@ViewChild('masterKeyInput', {read: MatInput})
	public masterKeyInput?: MatInput;

	/** PIN to be used for login attempt. */
	public readonly pin = new BehaviorSubject<string>('');

	/** Indicates whether PIN is custom. */
	public readonly pinIsCustom = new BehaviorSubject<boolean>(true);

	/** Indicates whether a PIN unlock using saved credentials will be performed. */
	public readonly pinUnlock = new BehaviorSubject<boolean>(false);

	/** Username saved in local storage from previous login. */
	public readonly savedUsername = new BehaviorSubject<string | undefined>(
		undefined
	);

	/** Username to be used for login attempt. */
	public readonly username = new BehaviorSubject<string>('');

	/** @see usernameMask */
	public readonly usernameMask: any = usernameMask;

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

		if (!this.accountDatabaseService.currentUser.value) {
			return;
		}

		await this.router.navigate(
			this.accountDatabaseService.currentUser.value.masterKeyConfirmed ||
				this.accountDatabaseService.currentUser.value.pseudoAccount ?
				this.activatedRoute.snapshot.url.length > 0 ?
					[
						'',
						...(this.activatedRoute.snapshot.url.slice(-1)[0]
							?.path === 'login' ?
							/* Trim unwanted /login from the end */
							this.activatedRoute.snapshot.url.slice(0, -1) :
							this.activatedRoute.snapshot.url
						).map(o => o.path)
					] :
					[''] :
				['welcome']
		);

		if (this.envService.isCordova && this.envService.isAndroid) {
			(<any> self).androidBackbuttonReady = true;
		}
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		if (this.accountDatabaseService.currentUser.value?.user) {
			return this.postLogin();
		}

		this.checking.next(true);
		this.accountService.resolveUiReady();

		try {
			const [
				altMasterKey,
				pinIsCustom,
				savedMasterKey,
				savedUsername
			] = await Promise.all([
				this.localStorageService
					.getItem('altMasterKey', BooleanProto, undefined, true)
					.catch(() => false),
				this.localStorageService
					.getItem('pinIsCustom', BooleanProto, undefined, true)
					.catch(() => true),
				this.localStorageService
					.getItem('masterKey', BinaryProto, undefined, true)
					.catch(() => undefined),
				this.localStorageService
					.getItem('username', StringProto, undefined, true)
					.catch(() => undefined)
			]);

			this.altMasterKey.next(altMasterKey);
			this.pinIsCustom.next(pinIsCustom);
			this.savedMasterKey.next(savedMasterKey);
			this.savedUsername.next(savedUsername);

			if (
				!(savedMasterKey && savedUsername) ||
				this.accountAuthService.pseudoAccountLogin.value
			) {
				/* If we decide to skip the lock screen password setup by default:

				if (
					!(savedMasterKey && savedUsername) &&
					this.accountAuthService.pseudoAccountLogin.value
				) {
					await this.submit();
				}
				*/

				return;
			}

			this.pinUnlock.next(true);

			const savedPIN = await this.accountAuthService.getSavedPIN();

			if (
				savedPIN &&
				(await this.accountAuthService.login(
					savedUsername,
					savedMasterKey,
					savedPIN,
					altMasterKey
				))
			) {
				this.potassiumService.clearMemory(savedPIN);
				await this.postLogin();
			}
		}
		finally {
			this.checking.next(false);
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
	public async submit (
		newPin?: {
			isCustom: boolean;
			value: string;
		},
		newDeviceActivationCredentials?: {
			altMasterKey: string;
			username: string;
		}
	) : Promise<void> {
		this.checking.next(true);
		this.error.next(false);

		if (this.accountAuthService.pseudoAccountLogin.value) {
			this.error.next(
				!(await this.accountAuthService.register(
					{pseudoAccount: true},
					undefined,
					undefined,
					newPin
				))
			);
		}
		else {
			if (
				!this.pinUnlock.value &&
				this.savedUsername.value &&
				this.username.value &&
				this.masterKey.value?.length > 0
			) {
				await this.removeSavedCredentials();
			}

			this.error.next(
				!(await (newDeviceActivationCredentials ?
					this.accountAuthService.login(
						newDeviceActivationCredentials.username,
						newDeviceActivationCredentials.altMasterKey,
						undefined,
						true
					) :
				this.pinUnlock.value &&
					this.savedMasterKey.value &&
					this.savedUsername.value ?
					this.accountAuthService.login(
						this.savedUsername.value,
						this.savedMasterKey.value,
						this.pin.value,
						this.altMasterKey.value
					) :
					this.accountAuthService.login(
						this.username.value,
						this.masterKey.value
					)))
			);
		}

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
		super();

		this.activationCodeSectionOpen = this.activatedRoute.url.pipe(
			map(url => url.length > 0 && url.slice(-1)[0].path === 'activate')
		);

		this.loggingIn = observableAll([
			this.pinUnlock,
			this.activatedRoute.url.pipe(
				map(url => url.length > 0 && url.slice(-1)[0].path === 'login')
			)
		]).pipe(map(([pinUnlock, loginStep2]) => pinUnlock || loginStep2));

		this.subscriptions.push(
			this.activatedRoute.url.subscribe(() => {
				this.error.next(false);
			})
		);

		if (
			(<any> self).androidBackbuttonReady &&
			this.accountDatabaseService.currentUser.value &&
			this.accountDatabaseService.currentUser.value.user
		) {
			(<any> self).plugins.appMinimize.minimize();
		}

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof document === 'object' && typeof document.body === 'object') {
			document.body.classList.remove('primary-account-theme');
		}
	}
}
