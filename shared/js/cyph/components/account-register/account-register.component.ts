/* eslint-disable max-lines */

import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	OnDestroy,
	OnInit,
	Output,
	ViewChild
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, concat, from, Observable, of} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {xkcdPassphrase} from 'xkcd-passphrase';
import {SecurityModels, usernameMask} from '../../account';
import {BaseProvider} from '../../base-provider';
import {AccountNewDeviceActivationComponent} from '../../components/account-new-device-activation';
import {InAppPurchaseComponent} from '../../components/in-app-purchase';
import {emailPattern, emailRegex} from '../../email-pattern';
import {BinaryProto, CyphPlans, IPGPMetadata} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AnalyticsService} from '../../services/analytics.service';
import {ConfigService} from '../../services/config.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {PGPService} from '../../services/crypto/pgp.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {LocalStorageService} from '../../services/local-storage.service';
import {SalesService} from '../../services/sales.service';
import {SignupService} from '../../services/signup.service';
import {StringsService} from '../../services/strings.service';
import {WindowWatcherService} from '../../services/window-watcher.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {safeStringCompare} from '../../util/compare';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {formControlMatch, watchFormControl} from '../../util/form-controls';
import {normalize, toInt} from '../../util/formatting';
import {observableAll} from '../../util/observable-all';
import {random} from '../../util/random';
import {titleize} from '../../util/titleize';
import {uuid} from '../../util/uuid';
import {resolvable, sleep} from '../../util/wait';

/**
 * Angular component for account register UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-register',
	styleUrls: ['./account-register.component.scss'],
	templateUrl: './account-register.component.html'
})
export class AccountRegisterComponent
	extends BaseProvider
	implements OnDestroy, OnInit
{
	/** Alternate master key. */
	private readonly altMasterKey = uuid(true, false);

	/** @ignore */
	private inviteCodeDebounceLast?: string;

	/** @ignore */
	private readonly postSimpleRegisterSetupWatcher =
		new BehaviorSubject<boolean>(false);

	/** @ignore */
	private usernameDebounceLast?: string;

	/** Indicates which additional devices have been set up. */
	public readonly additionalDevices = {
		desktop: new BehaviorSubject<number>(0),
		mobile: new BehaviorSubject<number>(0),
		paperMasterKey: new BehaviorSubject<boolean>(false)
	};

	/** Indicates whether the additional device setup is sufficient. */
	public readonly additionalDevicesReady: BehaviorSubject<boolean>;

	/** Indicates whether registration attempt is in progress. */
	public readonly checking = new BehaviorSubject<boolean>(false);

	/** If true, will display only the initial master key confirmation UI. */
	@Input() public confirmMasterKeyOnly: boolean = false;

	/** @see CyphPlans */
	public readonly cyphPlans = CyphPlans;

	/** Indicates the last step that the user is currently able to move on to. */
	public readonly currentStep: BehaviorSubject<number>;

	/** Email address. */
	public readonly email = new BehaviorSubject<string>('');

	/** @see emailPattern */
	public readonly emailPattern = emailPattern;

	/** Used for final confirmation of credentials. */
	public readonly finalConfirmation = {
		masterKey: ''
	};

	/** If true, will display only the master key UI and output value upon submission. */
	@Input() public getMasterKeyOnly: boolean = false;

	/** Submit button text when getting only master key or lock screen password. */
	@Input() public getPasswordSubmitText: string = this.stringsService.submit;

	/** If true, will display only the lock screen password UI and output value upon submission. */
	@Input() public getPinOnly: boolean = false;

	/** Password visibility settings. */
	public readonly hidePassword = {
		finalConfirmation: new BehaviorSubject<boolean>(true),
		lockScreenPIN: new BehaviorSubject<boolean>(true),
		lockScreenPassword: new BehaviorSubject<boolean>(true),
		lockScreenPasswordConfirm: new BehaviorSubject<boolean>(true),
		lockScreenPinConfirm: new BehaviorSubject<boolean>(true),
		masterKey: new BehaviorSubject<boolean>(true),
		masterKeyConfirm: new BehaviorSubject<boolean>(true)
	};

	/** If true, will hide the top description text of the lock screen password UI. */
	@Input() public hidePinDescription: boolean = false;

	/** @see InAppPurchaseComponent */
	@ViewChild('inAppPurchase', {read: InAppPurchaseComponent})
	public inAppPurchase?: InAppPurchaseComponent;

	/** @see InAppPurchaseComponent */
	@ViewChild('inAppPurchaseExistingInvite', {read: InAppPurchaseComponent})
	public inAppPurchaseExistingInvite?: InAppPurchaseComponent;

	/** Invite code. */
	public readonly inviteCode = new FormControl('');

	/** Metadata pulled for current invite code. */
	public readonly inviteCodeData = new BehaviorSubject<{
		email?: string;
		inviteCode?: string;
		inviterUsername?: string;
		isValid: boolean;
		keybaseUsername?: string;
		pgpPublicKey?: string;
		plan: CyphPlans;
		reservedUsername?: string;
		welcomeLetter?: string;
	}>({
		inviteCode: '',
		isValid: false,
		plan: CyphPlans.Free
	});

	/** Watches invite code. */
	public readonly inviteCodeWatcher: Observable<FormControl>;

	/** Lock screen password. */
	public readonly lockScreenPassword = new BehaviorSubject<string>('');

	/** Lock screen password confirmation. */
	public readonly lockScreenPasswordConfirm = formControlMatch(
		this.lockScreenPassword
	);

	/** Watches lockScreenPasswordConfirm. */
	public readonly lockScreenPasswordConfirmWatcher = watchFormControl(
		this.lockScreenPasswordConfirm
	);

	/** Minimum length of lock screen PIN/password. */
	public readonly lockScreenPasswordLength: number = 4;

	/** Indicates whether the lock screen password is viable. */
	public readonly lockScreenPasswordReady: BehaviorSubject<boolean>;

	/** Lock screen PIN. */
	public readonly lockScreenPIN = new BehaviorSubject<string>('');

	/** Lock screen PIN confirmation. */
	public readonly lockScreenPinConfirm = new BehaviorSubject<string>('');

	/** Master key (main account password). */
	public readonly masterKey = new BehaviorSubject<string>('');

	/** Master key confirmation. */
	public readonly masterKeyConfirm = formControlMatch(this.masterKey);

	/** Watches masterKeyConfirm. */
	public readonly masterKeyConfirmWatcher = watchFormControl(
		this.masterKeyConfirm
	);

	/** Indicates whether the master key is viable. */
	public readonly masterKeyReady: BehaviorSubject<boolean>;

	/** Name. */
	public readonly name = new BehaviorSubject<string>('');

	/** Indicates whether master key OPSEC rules have been acknowledged. */
	public readonly opsecAcknowledgement = new BehaviorSubject<boolean>(false);

	/** If true, will modify UI for setting up paper master key. */
	@Input() public paperMasterKeySetupMode: boolean = false;

	/** PGP data. */
	public readonly pgp = new BehaviorSubject<
		| {
				keybaseUsername?: string;
				pgpMetadata?: IPGPMetadata;
				publicKey?: string;
				publicKeyBytes?: Uint8Array;
		  }
		| undefined
	>(undefined);

	/** Phase of registration process. */
	public readonly phase = new BehaviorSubject<number>(0);

	/** If true, may skip setting lock screen password. */
	@Input() public pinSkippable: boolean = false;

	/** If true, will display only the post-simple-register initial setup UI. */
	@Input() public postSimpleRegisterSetup: boolean = false;

	/** Indicates whether the simplified UI is enabled. */
	public readonly simple: BehaviorSubject<boolean> = toBehaviorSubject(
		this.activatedRoute.data.pipe(map(o => !!o.simple)),
		false,
		this.subscriptions
	);

	/** Sets a spoiler on generated master key. */
	public readonly spoiler = new BehaviorSubject<boolean>(true);

	/** List of error messages blocking initiating a registration attempt. */
	public readonly submissionReadinessErrors: BehaviorSubject<string[]>;

	/** Set when the last registration attempt has failed. */
	public readonly submitError = new BehaviorSubject<string | undefined>(
		undefined
	);

	/**
	 * Master key submission.
	 * @see getMasterKeyOnly
	 */
	@Output() public readonly submitMasterKey = new EventEmitter<string>();

	/**
	 * Lock screen password submission.
	 * @see getPinOnly
	 */
	@Output() public readonly submitPIN = new EventEmitter<
		{isCustom: boolean; value: string} | undefined
	>();

	/** Form tab index. */
	public readonly tabIndex = new BehaviorSubject<number>(0);

	/** @see titleize */
	public readonly titleize = titleize;

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** Indicates whether or not lockScreenPIN should be used in place of lockScreenPassword. */
	public readonly useLockScreenPIN = new BehaviorSubject<boolean>(true);

	/** Username. */
	public readonly username = new FormControl('', undefined, [
		async control => {
			const value = control.value;
			const id = uuid();
			this.usernameDebounceLast = id;

			await sleep(500);

			if (this.usernameDebounceLast !== id || !value) {
				/* eslint-disable-next-line no-null/no-null */
				return null;
			}

			return value &&
				value.length <
					this.configService.planConfig[
						this.inviteCodeData.value.plan
					].usernameMinLength &&
				!(
					this.inviteCodeData.value.reservedUsername &&
					value ===
						normalize(this.inviteCodeData.value.reservedUsername)
				) ?
				{usernameTooShort: true} :
			(await this.accountUserLookupService.usernameBlacklisted(
					value,
					this.inviteCodeData.value.reservedUsername
				)) ||
				(await this.accountUserLookupService.exists(value, false)) ?
				{usernameTaken: true} :
				/* eslint-disable-next-line no-null/no-null */
				null;
		}
	]);

	/** @see usernameMask */
	public readonly usernameMask = usernameMask;

	/** Watches username. */
	public readonly usernameWatcher = watchFormControl(this.username);

	/** Indicates whether or not xkcdPassphrase should be used. */
	public readonly useXkcdPassphrase = new BehaviorSubject<boolean>(true);

	/** Auto-generated password option selection. */
	public readonly xkcdPassphrase = new BehaviorSubject<number>(
		this.configService.masterKey.defaultSize
	);

	/** Auto-generated password options. */
	public xkcdPassphrases: (() => Promise<string>)[] | undefined =
		this.configService.masterKey.sizes.map(n =>
			memoize(async () => (n === 0 ? '' : xkcdPassphrase.generate(n)))
		);

	/** Indicates whether xkcdPassphrase has been viewed. */
	public readonly xkcdPassphraseHasBeenViewed = new BehaviorSubject<boolean>(
		false
	);

	/** @ignore */
	private async postSimpleRegisterSetupSubmit () : Promise<void> {
		await this.confirmMasterKey({
			skipMasterKeyConfirm: true,
			updatePIN: true
		});
	}

	/** @ignore */
	private async validateInviteCode (value: string) : Promise<void> {
		const id = uuid();
		this.inviteCodeDebounceLast = id;

		this.inviteCodeData.next(
			await (this.inviteCodeData.value.inviteCode === '' ?
				Promise.resolve() :
				sleep(500)
			).then(async () => {
				let o =
					this.inviteCodeDebounceLast === id && value ?
						await this.accountDatabaseService
							.callFunction('checkInviteCode', {
								inviteCode: value
							})
							.catch(() => undefined) :
						undefined;

				if (typeof o !== 'object') {
					o = {};
				}

				const isValid = o.isValid === true;

				if (isValid && value) {
					this.localStorageService.setString(
						'pendingInviteCode',
						value
					);
				}

				return {
					email: typeof o.email === 'string' ? o.email : undefined,
					inviteCode: value,
					inviterUsername:
						typeof o.inviterUsername === 'string' ?
							o.inviterUsername :
							undefined,
					isValid,
					keybaseUsername:
						typeof o.keybaseUsername === 'string' ?
							o.keybaseUsername :
							undefined,
					pgpPublicKey:
						typeof o.pgpPublicKey === 'string' ?
							o.pgpPublicKey :
							undefined,
					plan: o.plan in CyphPlans ? o.plan : CyphPlans.Free,
					reservedUsername:
						typeof o.reservedUsername === 'string' ?
							o.reservedUsername :
							undefined,
					welcomeLetter:
						typeof o.welcomeLetter === 'string' ?
							o.welcomeLetter :
							undefined
				};
			})
		);

		if (this.inviteCodeData.value.email && !this.email.value) {
			this.email.next(this.inviteCodeData.value.email);
		}

		if (
			this.inviteCodeData.value.reservedUsername &&
			!this.username.value
		) {
			this.username.setValue(this.inviteCodeData.value.reservedUsername);
		}
		else {
			/* Trigger validator function */
			this.username.setValue(this.username.value);
		}

		if (
			(this.inviteCodeData.value.keybaseUsername ||
				this.inviteCodeData.value.pgpPublicKey) &&
			!this.pgp.value
		) {
			this.pgp.next({
				keybaseUsername: this.inviteCodeData.value.keybaseUsername,
				...(this.inviteCodeData.value.pgpPublicKey ?
					await this.pgpService.getPublicKeyMetadata(
						this.inviteCodeData.value.pgpPublicKey
					) :
					{})
			});
		}

		const invalid = !this.inviteCodeData.value.isValid;

		this.inviteCode.setErrors(
			invalid ?
				{inviteCodeInvalid: true} :
				/* eslint-disable-next-line no-null/no-null */
				null
		);

		this.accountService.resolveUiReady();
	}

	/** Marks master key as confirmed. */
	public async confirmMasterKey (options?: {
		skipMasterKeyConfirm?: boolean;
		skipPinConfirm?: boolean;
		updatePIN?: boolean;
	}) : Promise<void> {
		if (!this.accountDatabaseService.currentUser.value) {
			return;
		}

		try {
			this.checking.next(true);

			const masterKey = !this.useXkcdPassphrase.value ?
				this.masterKey.value :
			this.xkcdPassphrases ?
				await this.xkcdPassphrases[this.xkcdPassphrase.value]() :
				'';

			const pin = this.useLockScreenPIN.value ?
				this.lockScreenPIN.value :
				this.lockScreenPassword.value;

			const pinConfirm = this.useLockScreenPIN.value ?
				this.lockScreenPinConfirm.value :
				this.lockScreenPasswordConfirm.value;

			if (
				(!options?.skipMasterKeyConfirm &&
					!safeStringCompare(
						masterKey,
						this.finalConfirmation.masterKey
					)) ||
				(options?.updatePIN &&
					!options?.skipPinConfirm &&
					!safeStringCompare(pin, pinConfirm))
			) {
				await sleep(random(750, 250));
				this.submitError.next(this.stringsService.invalidMasterKey);
				return;
			}

			await Promise.all([
				(options?.updatePIN ?
					this.accountAuthService.changePIN(
						{
							isCustom: !this.useLockScreenPIN.value,
							value: pin
						},
						true
					) :
					Promise.resolve()
				)
					.then(async () =>
						this.accountAuthService.changeMasterKey(
							masterKey,
							true,
							false
						)
					)
					.then(async () =>
						Promise.all([
							this.accountDatabaseService.removeItem(
								'masterKeyUnconfirmed'
							),
							this.localStorageService.removeItem(
								'unconfirmedMasterKey'
							)
						])
					),
				sleep(random(750, 250))
			]);

			this.submitError.next(undefined);

			this.accountDatabaseService.currentUser.next({
				...this.accountDatabaseService.currentUser.value,
				masterKeyConfirmed: true
			});
		}
		finally {
			this.checking.next(false);
		}
	}

	/** Submits master key. */
	public async getMasterKey () : Promise<void> {
		try {
			this.checking.next(true);
			await sleep(random(750, 250));

			const masterKey = !this.useXkcdPassphrase.value ?
				this.masterKey.value :
			this.xkcdPassphrases ?
				await this.xkcdPassphrases[this.xkcdPassphrase.value]() :
				'';

			if (
				!safeStringCompare(masterKey, this.finalConfirmation.masterKey)
			) {
				this.submitError.next(this.stringsService.invalidMasterKey);
				return;
			}

			this.submitError.next(undefined);
			this.submitMasterKey.emit(masterKey);
		}
		finally {
			this.checking.next(false);
		}
	}

	/** Activates another device. */
	public async newDeviceActivation (mobile: boolean) : Promise<void> {
		if (typeof this.username.value !== 'string') {
			return;
		}

		const activationComplete = resolvable<boolean>();
		const closeFunction = resolvable<() => void>();

		const sessionData = {
			aliceMasterKey: this.altMasterKey,
			aliceUsername: this.username.value,
			bobSessionID: undefined
		};

		const closed = this.dialogService.baseDialog(
			AccountNewDeviceActivationComponent,
			o => {
				o.mobile = mobile;
				o.sessionData = sessionData;

				activationComplete.resolve(
					o.activationComplete
						.pipe(take(1))
						.toPromise()
						.then(b => {
							mobile = o.mobileDeviceActivation.value;
							return b;
						})
				);
			},
			closeFunction,
			false,
			{
				large: true,
				lightTheme: true
			}
		);

		const success = await activationComplete;

		if (success) {
			const additionalDevices = mobile ?
				this.additionalDevices.mobile :
				this.additionalDevices.desktop;

			additionalDevices.next(additionalDevices.value + 1);
		}

		(await closeFunction)();
		await closed;
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		super.ngOnDestroy();

		this.finalConfirmation.masterKey = '';

		this.email.next('');
		this.inviteCode.setValue('');
		this.lockScreenPassword.next('');
		this.lockScreenPasswordConfirm.setValue('');
		this.lockScreenPIN.next('');
		this.lockScreenPinConfirm.next('');
		this.masterKey.next('');
		this.masterKeyConfirm.setValue('');
		this.name.next('');
		this.username.setValue('');
		this.useLockScreenPIN.next(false);
		this.useXkcdPassphrase.next(false);
		this.xkcdPassphrase.next(0);
		this.xkcdPassphrases = undefined;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		this.accountService.transitionEnd();
		this.postSimpleRegisterSetupWatcher.next(this.postSimpleRegisterSetup);

		const pendingInviteCodePromise = this.localStorageService
			.getString('pendingInviteCode')
			.catch(() => '');

		const setPendingInviteCode = async () => {
			if (this.inviteCode.value) {
				return;
			}

			const pendingInviteCode = await pendingInviteCodePromise;

			if (!pendingInviteCode && this.simple.value) {
				await this.router.navigate([this.accountService.routePath[0]]);
				return;
			}

			this.inviteCode.setValue(pendingInviteCode);

			if (!pendingInviteCode && !this.inviteCode.value) {
				await this.validateInviteCode('');
			}
		};

		if (
			this.confirmMasterKeyOnly ||
			this.getMasterKeyOnly ||
			this.getPinOnly ||
			this.postSimpleRegisterSetup
		) {
			if (this.accountDatabaseService.currentUser.value) {
				this.username.setValue(
					this.accountDatabaseService.currentUser.value.user.username
				);
			}

			this.accountService.resolveUiReady();
			return;
		}

		this.subscriptions.push(
			this.activatedRoute.params.subscribe(async o => {
				if (typeof o.step === 'string') {
					const [stepString, username] = o.step.split(':');

					if (username) {
						this.username.setValue(username);
					}

					const step = toInt(stepString);

					/* Allow "step" parameter to double up as invite code */
					if (isNaN(step) && !this.inviteCode.value) {
						this.inviteCode.setValue(stepString);

						this.analyticsService.sendEvent(
							'invite-open',
							'new',
							stepString,
							1
						);
					}
					else if (
						!isNaN(step) &&
						step > 0 &&
						step <= this.totalSteps + 1
					) {
						this.tabIndex.next(step - 1);
						await setPendingInviteCode();
						return;
					}
					else {
						await setPendingInviteCode();
					}
				}

				this.router.navigate([this.accountService.routePath[0], '1']);
			})
		);

		await this.accountService.uiReady;

		this.subscriptions.push(
			observableAll([this.currentStep, this.tabIndex]).subscribe(
				([currentStep, tabIndex]) => {
					if (tabIndex > currentStep) {
						this.updateRoute(0, currentStep);
					}
				}
			)
		);
	}

	/** Sets up a paper master key. */
	public async paperMasterKeySetup () : Promise<void> {
		const submitMasterKey = resolvable<string>();
		const closeFunction = resolvable<() => void>();

		const closed = this.dialogService.baseDialog(
			AccountRegisterComponent,
			o => {
				o.getMasterKeyOnly = true;
				o.paperMasterKeySetupMode = true;

				submitMasterKey.resolve(
					o.submitMasterKey.pipe(take(1)).toPromise()
				);
			},
			closeFunction,
			false,
			{
				large: true,
				lightTheme: true
			}
		);

		const masterKey = await submitMasterKey;

		if (masterKey) {
			this.masterKey.next(masterKey);
			this.additionalDevices.paperMasterKey.next(true);
		}

		(await closeFunction)();
		await closed;
	}

	/** Switches from initial phase of registration process. */
	public async preSubmit () : Promise<void> {
		if (this.submissionReadinessErrors.value.length > 0) {
			return;
		}

		this.checking.next(true);
		this.submitError.next(undefined);
		await sleep(random(750, 250));
		this.phase.next(1);
		this.checking.next(false);
	}

	/** Initiates registration attempt. */
	public async submit () : Promise<void> {
		if (!this.simple.value && this.tabIndex.value !== this.totalSteps) {
			return;
		}

		if (this.postSimpleRegisterSetup) {
			return this.postSimpleRegisterSetupSubmit();
		}

		this.checking.next(false);

		if (this.submissionReadinessErrors.value.length > 0) {
			this.submitError.next(this.stringsService.signupFailed);
			return;
		}

		const masterKey = !this.additionalDevices.paperMasterKey.value ?
			uuid(true, false) :
			this.masterKey.value;

		this.checking.next(true);

		this.submitError.next(undefined);

		try {
			if (this.simple.value) {
				await this.localStorageService.setString(
					'unconfirmedMasterKey',
					masterKey
				);

				/* Confirm successful set */
				if (
					!safeStringCompare(
						masterKey,
						await this.localStorageService.getString(
							'unconfirmedMasterKey'
						)
					)
				) {
					throw new Error('Setting unconfirmedMasterKey failed.');
				}
			}

			this.submitError.next(
				(await this.accountAuthService.register(
					this.username.value,
					masterKey,
					this.altMasterKey,
					{
						isCustom: !this.useLockScreenPIN.value,
						value: this.useLockScreenPIN.value ?
							this.lockScreenPIN.value :
							this.lockScreenPassword.value
					},
					this.name.value,
					this.email.value ?
						this.email.value.trim().toLowerCase() :
						undefined,
					this.inviteCode.value,
					this.pgp.value ?
						{
							pgp: {
								keybaseUsername: this.pgp.value.keybaseUsername,
								publicKey: this.pgp.value.publicKeyBytes
							}
						} :
						undefined
				)) ?
					undefined :
					this.stringsService.signupFailed
			);

			if (!this.submitError.value && this.simple.value) {
				await this.accountDatabaseService.setItem(
					'masterKeyUnconfirmed',
					BinaryProto,
					new Uint8Array(0),
					SecurityModels.unprotected
				);
			}

			if (
				!this.submitError.value &&
				this.pgp.value?.pgpMetadata?.fingerprint &&
				this.pgp.value.pgpMetadata.keyID &&
				this.pgp.value.publicKeyBytes
			) {
				await this.accountFilesService.uploadPGPKey({
					pgpMetadata: this.pgp.value.pgpMetadata,
					publicKey: this.pgp.value.publicKeyBytes
				});
			}
		}
		catch {
			this.submitError.next(this.stringsService.signupFailed);
		}

		this.checking.next(false);

		if (this.submitError.value !== undefined) {
			return;
		}

		this.analyticsService.sendEvent(
			'registration',
			'new',
			this.inviteCode.value,
			1
		);

		this.localStorageService.removeItem('pendingInviteCode');

		await this.router.navigate(['welcome']);
	}

	/** Total number of steps/tabs (minus one). */
	public get totalSteps () : number {
		return this.postSimpleRegisterSetup ? 2 : 3;
	}

	/** Updates route for consistency with tabIndex. */
	public updateRoute (
		increment: number = 0,
		tabIndex: number = this.tabIndex.value
	) : void {
		if (this.postSimpleRegisterSetup) {
			this.tabIndex.next(tabIndex + increment);
			return;
		}

		this.router.navigate([
			this.accountService.routePath[0],
			(tabIndex + increment + 1).toString()
		]);
	}

	/** Submits to waitlist. */
	public async waitlistSignup () : Promise<void> {
		if (!this.email.value || !this.name.value) {
			return;
		}

		this.accountService.interstitial.next(true);

		let success = false;

		try {
			success = await this.signupService
				.submit({
					email: this.email.value.trim().toLowerCase(),
					name: this.name.value,
					usernameRequest: this.username.value
				})
				.then(() => true)
				.catch(() => false);
		}
		finally {
			this.accountService.interstitial.next(false);
		}

		await this.dialogService.alert({
			content: success ?
				this.stringsService.waitlistSignupConfirm :
				this.stringsService.waitlistSignupFailure,
			title: this.stringsService.waitlistSignupTitle
		});
	}

	/** xkcdPassphrase slider label function. */
	public readonly xkcdSliderDisplayWith = (n: number) =>
		(this.configService.masterKey.sizes[n] || 0).toString();

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly signupService: SignupService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService,

		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see PGPService */
		public readonly pgpService: PGPService,

		/** @see SalesService */
		public readonly salesService: SalesService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.additionalDevicesReady = this.additionalDevices.paperMasterKey;

		this.subscriptions.push(
			this.inviteCode.valueChanges.subscribe(value => {
				if (
					typeof value === 'string' &&
					value !== this.inviteCodeData.value.inviteCode
				) {
					this.validateInviteCode(value);
				}
			})
		);

		this.inviteCodeWatcher = concat(
			of(this.inviteCode),
			observableAll([
				this.inviteCode.statusChanges,
				this.inviteCode.valueChanges
			]).pipe(map(() => this.inviteCode))
		);

		this.lockScreenPasswordReady = toBehaviorSubject(
			observableAll([
				this.lockScreenPassword,
				this.lockScreenPasswordConfirmWatcher,
				this.lockScreenPIN,
				this.lockScreenPinConfirm,
				this.useLockScreenPIN
			]).pipe(
				map(
					([
						lockScreenPassword,
						lockScreenPasswordConfirm,
						lockScreenPIN,
						lockScreenPinConfirm,
						useLockScreenPIN
					]) =>
						useLockScreenPIN ?
							lockScreenPIN.length ===
								this.lockScreenPasswordLength &&
							safeStringCompare(
								lockScreenPIN,
								lockScreenPinConfirm
							) :
							lockScreenPassword.length >=
								this.lockScreenPasswordLength &&
							lockScreenPasswordConfirm.valid
				)
			),
			false,
			this.subscriptions
		);

		this.masterKeyReady = toBehaviorSubject(
			observableAll([
				this.masterKey,
				this.masterKeyConfirmWatcher,
				this.opsecAcknowledgement,
				this.useXkcdPassphrase,
				this.xkcdPassphraseHasBeenViewed
			]).pipe(
				map(
					([
						masterKey,
						masterKeyConfirm,
						opsecAcknowledgement,
						useXkcdPassphrase,
						xkcdPassphraseHasBeenViewed
					]) =>
						opsecAcknowledgement &&
						(useXkcdPassphrase ?
							xkcdPassphraseHasBeenViewed :
							masterKey.length >=
								this.configService.masterKey.customMinLength &&
							masterKeyConfirm.valid)
				)
			),
			false,
			this.subscriptions
		);

		this.submissionReadinessErrors = toBehaviorSubject(
			observableAll([
				this.additionalDevicesReady,
				this.checking,
				this.email,
				this.inviteCodeWatcher,
				this.lockScreenPasswordReady,
				this.name,
				this.postSimpleRegisterSetupWatcher,
				this.simple,
				this.usernameWatcher,
				from(
					this.xkcdPassphrases ?
						this.xkcdPassphrases[
							this.configService.masterKey.defaultSize
						]() :
						Promise.resolve('')
				)
			]).pipe(
				map(
					([
						additionalDevicesReady,
						checking,
						email,
						inviteCode,
						lockScreenPasswordReady,
						name,
						postSimpleRegisterSetup,
						simple,
						username,
						xkcd
					]) =>
						checking ?
							[] :
							[
								...(!simple && !additionalDevicesReady ?
									[
										this.stringsService
											.registerErrorAdditionalDevices
									] :
									[]),
								...(!postSimpleRegisterSetup &&
								email &&
								!emailRegex.test(email) ?
									[this.stringsService.registerErrorEmail] :
									[]),
								...(!postSimpleRegisterSetup &&
								(!inviteCode.value || inviteCode.errors) ?
									[
										this.stringsService
											.registerErrorInviteCode
									] :
									[]),
								...(!simple && !lockScreenPasswordReady ?
									[
										this.stringsService
											.registerErrorLockScreen
									] :
									[]),
								...(!postSimpleRegisterSetup && !name ?
									[this.stringsService.registerErrorName] :
									[]),
								...(!postSimpleRegisterSetup &&
								(!username.value || username.errors) ?
									[
										this.stringsService
											.registerErrorUsername
									] :
									[]),
								...(!simple && xkcd.length < 1 ?
									[
										this.stringsService
											.registerErrorInitializing
									] :
									[])
							]
				)
			),
			[this.stringsService.registerErrorInitializing],
			this.subscriptions
		);

		this.currentStep = toBehaviorSubject<number>(
			observableAll([
				this.additionalDevicesReady,
				this.email,
				this.inviteCodeWatcher,
				this.lockScreenPasswordReady,
				this.name,
				this.postSimpleRegisterSetupWatcher,
				this.tabIndex,
				this.usernameWatcher
			]).pipe(
				map(
					([
						additionalDevicesReady,
						email,
						inviteCode,
						lockScreenPasswordReady,
						name,
						postSimpleRegisterSetup,
						tabIndex,
						username
					]) =>
						!postSimpleRegisterSetup ?
							(email && !emailRegex.test(email)) ||
							  !inviteCode.value ||
							  inviteCode.errors ||
							  !name ||
							  !username.value ||
							  username.errors ||
							  (tabIndex === 0 &&
									(username.pending || inviteCode.pending)) ?
								0 :
							!additionalDevicesReady ?
								1 :
							!lockScreenPasswordReady ?
								2 :
								3 :
						!additionalDevicesReady ?
							0 :
						!lockScreenPasswordReady ?
							1 :
							2
				)
			),
			0,
			this.subscriptions
		);

		this.subscriptions.push(
			this.windowWatcherService.visibility
				.pipe(filter(b => b))
				.subscribe(() => {
					const value =
						typeof this.inviteCode.value === 'string' ?
							this.inviteCode.value :
							undefined;

					if (!value) {
						return;
					}

					this.validateInviteCode(value);
				})
		);
	}
}
