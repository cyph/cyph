import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	OnInit,
	Output
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject, combineLatest, concat, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {xkcdPassphrase} from 'xkcd-passphrase';
import {usernameMask} from '../../account';
import {BaseProvider} from '../../base-provider';
import {emailPattern} from '../../email-pattern';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {DatabaseService} from '../../services/database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {safeStringCompare} from '../../util/compare';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {formControlMatch, watchFormControl} from '../../util/form-controls';
import {toInt} from '../../util/formatting';
import {random} from '../../util/random';
import {uuid} from '../../util/uuid';
import {sleep} from '../../util/wait';


/**
 * Angular component for account register UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-register',
	styleUrls: ['./account-register.component.scss'],
	templateUrl: './account-register.component.html'
})
export class AccountRegisterComponent extends BaseProvider implements OnInit {
	/** @ignore */
	private inviteCodeDebounceLast?: string;

	/** @ignore */
	private usernameDebounceLast?: string;

	/** Indicates whether registration attempt is in progress. */
	public readonly checking							= new BehaviorSubject<boolean>(false);

	/** Email addres. */
	public readonly email								= new BehaviorSubject<string>('');

	/** @see emailPattern */
	public readonly emailPattern						= emailPattern;

	/** Used for final confirmation of credentials. */
	public readonly finalConfirmation					= {
		masterKey: ''
	};

	/** If true, will display only the master key UI and output value upon submission. */
	@Input() public getMasterKeyOnly: boolean			= false;

	/** Submit button text when getting only master key or lock screen password. */
	@Input() public getPasswordSubmitText: string		= this.stringsService.submit;

	/** If true, will display only the lock screen password UI and output value upon submission. */
	@Input() public getPinOnly: boolean					= false;

	/** Password visibility settings. */
	public readonly hidePassword						= {
		finalConfirmation: new BehaviorSubject<boolean>(true),
		lockScreenPIN: new BehaviorSubject<boolean>(false),
		lockScreenPassword: new BehaviorSubject<boolean>(true),
		lockScreenPasswordConfirm: new BehaviorSubject<boolean>(true),
		masterKey: new BehaviorSubject<boolean>(true),
		masterKeyConfirm: new BehaviorSubject<boolean>(true)
	};

	/** If true, will hide the top description text of the lock screen password UI. */
	@Input() public hidePinDescription: boolean			= false;

	/** Invite code. */
	public readonly inviteCode							= new FormControl('', undefined, [
		async control => {
			const value					= control.value;
			const id					= uuid();
			this.inviteCodeDebounceLast	= id;

			return (await sleep(500).then(async () =>
				this.inviteCodeDebounceLast === id && value ?
					!(await this.databaseService.callFunction(
						'checkInviteCode',
						{inviteCode: value}
					).catch(
						() => ({isValid: false})
					)).isValid :
					true
			)) ?
				{inviteCodeInvalid: true} :
				/* tslint:disable-next-line:no-null-keyword */
				null
			;
		}
	]);

	/** Watches invite code. */
	public readonly inviteCodeWatcher					= concat(
		of(this.inviteCode),
		combineLatest(
			this.inviteCode.statusChanges,
			this.inviteCode.valueChanges
		).pipe(
			map(() => this.inviteCode)
		)
	);

	/** Lock screen password. */
	public readonly lockScreenPassword					= new BehaviorSubject<string>('');

	/** Lock screen password confirmation. */
	public readonly lockScreenPasswordConfirm			= formControlMatch(this.lockScreenPassword);

	/** Watches lockScreenPasswordConfirm. */
	public readonly lockScreenPasswordConfirmWatcher	= watchFormControl(
		this.lockScreenPasswordConfirm
	);

	/** Minimum length of lock screen PIN/password. */
	public readonly lockScreenPasswordLength: number	= 4;

	/** Indicates whether the lock screen password is viable. */
	public readonly lockScreenPasswordReady: BehaviorSubject<boolean>;

	/** Lock screen PIN. */
	public readonly lockScreenPIN						= new BehaviorSubject<string>('');

	/** Master key (main account password). */
	public readonly masterKey							= new BehaviorSubject<string>('');

	/** Master key confirmation. */
	public readonly masterKeyConfirm					= formControlMatch(this.masterKey);

	/** Watches masterKeyConfirm. */
	public readonly masterKeyConfirmWatcher				= watchFormControl(this.masterKeyConfirm);

	/** Minimum length of custom master key. */
	public readonly masterKeyLength: number				= 20;

	/** Indicates whether the master key is viable. */
	public readonly masterKeyReady: BehaviorSubject<boolean>;

	/** Name. */
	public readonly name								= new BehaviorSubject<string>('');

	/** Indicates whether master key OPSEC rules have been acknowledged. */
	public readonly opsecAcknowledgement				= new BehaviorSubject<boolean>(false);

	/** Phase of registration process. */
	public readonly phase								= new BehaviorSubject<number>(0);

	/** Sets a spoiler on generated master key. */
	public readonly spoiler								= new BehaviorSubject<boolean>(true);

	/** List of error messages blocking initiating a registration attempt. */
	public readonly submissionReadinessErrors: BehaviorSubject<string[]>;

	/** Set when the last registration attempt has failed. */
	public readonly submitError							=
		new BehaviorSubject<string|undefined>(undefined)
	;

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
	public readonly tabIndex							= new BehaviorSubject<number>(3);

	/** Total number of steps/tabs (minus one). */
	public readonly totalSteps: number					= 2;

	/** @see trackBySelf */
	public readonly trackBySelf							= trackBySelf;

	/** Indicates whether or not lockScreenPIN should be used in place of lockScreenPassword. */
	public readonly useLockScreenPIN					= new BehaviorSubject<boolean>(
		this.envService.isMobileOS
	);

	/** Username. */
	public readonly username							= new FormControl('', undefined, [
		async control => {
			const value					= control.value;
			const id					= uuid();
			this.usernameDebounceLast	= id;

			return (await sleep(500).then(async () =>
				this.usernameDebounceLast === id && value ?
					this.accountUserLookupService.exists(value, false, false) :
					true
			)) ?
				{usernameTaken: true} :
				/* tslint:disable-next-line:no-null-keyword */
				null
			;
		}
	]);

	/** @see usernameMask */
	public readonly usernameMask						= usernameMask;

	/** Watches username. */
	public readonly usernameWatcher						= watchFormControl(this.username);

	/** Indicates whether or not xkcdPassphrase should be used. */
	public readonly useXkcdPassphrase					= new BehaviorSubject<boolean>(true);

	/** Auto-generated password option. */
	public readonly xkcdPassphrase						= toBehaviorSubject<string>(
		xkcdPassphrase.generate(),
		''
	);

	/** Indicates whether xkcdPassphrase has been viewed. */
	public readonly xkcdPassphraseHasBeenViewed			= new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();

		if (this.getMasterKeyOnly || this.getPinOnly) {
			return;
		}

		this.subscriptions.push(this.activatedRoute.params.subscribe(async o => {
			if (typeof o.step === 'string') {
				const step	= toInt(o.step);

				/* Allow "step" parameter to double up as invite code */
				if (isNaN(step) && !this.inviteCode.value) {
					this.inviteCode.setValue(o.step);
				}
				else if (!isNaN(step) && step > 0 && step <= (this.totalSteps + 1)) {
					this.tabIndex.next(step - 1);
					return;
				}
			}

			this.router.navigate([accountRoot, 'register', '1']);
		}));
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
		this.checking.next(false);

		if (this.submissionReadinessErrors.value.length > 0 || !this.masterKeyReady.value) {
			this.submitError.next(this.stringsService.signupFailed);
			return;
		}

		const masterKey	=
			this.useXkcdPassphrase.value ?
				this.xkcdPassphrase.value :
				this.masterKey.value
		;

		if (!safeStringCompare(masterKey, this.finalConfirmation.masterKey)) {
			this.submitError.next(this.stringsService.invalidCredentials);
			return;
		}

		this.checking.next(true);
		this.submitError.next(undefined);

		this.submitError.next(
			(await this.accountAuthService.register(
				this.username.value,
				masterKey,
				{
					isCustom: !this.useLockScreenPIN.value,
					value: this.useLockScreenPIN.value ?
						this.lockScreenPIN.value :
						this.lockScreenPassword.value
				},
				this.name.value,
				this.email.value,
				this.inviteCode.value
			)) ?
				undefined :
				(this.accountAuthService.errorMessage.value || this.stringsService.signupFailed)
		);

		this.checking.next(false);

		if (this.submitError.value !== undefined) {
			return;
		}

		this.email.next('');
		this.inviteCode.setValue('');
		this.lockScreenPassword.next('');
		this.lockScreenPasswordConfirm.setValue('');
		this.lockScreenPIN.next('');
		this.masterKey.next('');
		this.masterKeyConfirm.setValue('');
		this.name.next('');
		this.username.setValue('');
		this.useLockScreenPIN.next(false);
		this.useXkcdPassphrase.next(false);
		this.xkcdPassphrase.next('');

		this.router.navigate([accountRoot, 'welcome']);
	}

	/** Updates route for consistency with tabIndex. */
	public updateRoute (increment: number = 0, tabIndex: number = this.tabIndex.value) : void {
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

		/** @ignore */
		private readonly databaseService: DatabaseService,

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

		this.lockScreenPasswordReady	= toBehaviorSubject(
			combineLatest(
				this.lockScreenPassword,
				this.lockScreenPasswordConfirmWatcher,
				this.lockScreenPIN,
				this.useLockScreenPIN
			).pipe(map(([
				lockScreenPassword,
				lockScreenPasswordConfirm,
				lockScreenPIN,
				useLockScreenPIN
			]) =>
				useLockScreenPIN ?
					lockScreenPIN.length === this.lockScreenPasswordLength :
					(
						lockScreenPassword.length >= this.lockScreenPasswordLength &&
						lockScreenPasswordConfirm.valid
					)
			)),
			false,
			this.subscriptions
		);

		this.masterKeyReady				= toBehaviorSubject(
			combineLatest(
				this.masterKey,
				this.masterKeyConfirmWatcher,
				this.opsecAcknowledgement,
				this.useXkcdPassphrase,
				this.xkcdPassphraseHasBeenViewed
			).pipe(map(([
				masterKey,
				masterKeyConfirm,
				opsecAcknowledgement,
				useXkcdPassphrase,
				xkcdPassphraseHasBeenViewed
			]) =>
				opsecAcknowledgement && (useXkcdPassphrase ?
					xkcdPassphraseHasBeenViewed :
					(
						masterKey.length >= this.masterKeyLength &&
						masterKeyConfirm.valid
					)
				)
			)),
			false,
			this.subscriptions
		);

		this.submissionReadinessErrors				= toBehaviorSubject(
			combineLatest(
				this.inviteCodeWatcher,
				this.lockScreenPasswordReady,
				this.name,
				this.usernameWatcher,
				this.xkcdPassphrase
			).pipe(map(([
				inviteCode,
				lockScreenPasswordReady,
				name,
				username,
				xkcd
			]) => [
				...(
					!inviteCode.value || inviteCode.errors ?
						[this.stringsService.registerErrorInviteCode] :
						[]
				),
				...(
					!lockScreenPasswordReady ?
						[this.stringsService.registerErrorLockScreen] :
						[]
				),
				...(
					!name ?
						[this.stringsService.registerErrorName] :
						[]
				),
				...(
					!username.value || username.errors ?
						[this.stringsService.registerErrorUsername] :
						[]
				),
				...(
					xkcd.length < 1 ?
						[this.stringsService.registerErrorInitializing] :
						[]
				)
			])),
			[this.stringsService.registerErrorInitializing],
			this.subscriptions
		);
	}
}
