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
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {map, skip, take} from 'rxjs/operators';
import {xkcdPassphrase} from 'xkcd-passphrase';
import {usernameMask} from '../../account';
import {emailPattern} from '../../email-pattern';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {safeStringCompare} from '../../util/compare';
import {toBehaviorSubject} from '../../util/flatten-observable';
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
export class AccountRegisterComponent implements OnInit {
	/** @ignore */
	private usernameDebounceLast?: string;

	/** Indicates whether registration attempt is in progress. */
	public readonly checking							= new BehaviorSubject<boolean>(false);

	/** Email addres. */
	public readonly email								= new BehaviorSubject<string>('');

	/** @see emailPattern */
	public readonly emailPattern						= emailPattern;

	/** Indicates whether the last registration attempt has failed. */
	public readonly error								= new BehaviorSubject<boolean>(false);

	/** If true, will display only the master key UI and output value upon submission. */
	@Input() public getMasterKeyOnly: boolean			= false;

	/** If true, will display only the lock screen password UI and output value upon submission. */
	@Input() public getPinOnly: boolean					= false;

	/** Password visibility settings. */
	public readonly hidePassword						= {
		lockScreenPIN: new BehaviorSubject<boolean>(false),
		lockScreenPassword: new BehaviorSubject<boolean>(true),
		lockScreenPasswordConfirm: new BehaviorSubject<boolean>(true),
		masterKey: new BehaviorSubject<boolean>(true),
		masterKeyConfirm: new BehaviorSubject<boolean>(true)
	};

	/** Invite code. */
	public readonly inviteCode							= new BehaviorSubject<string>('');

	/** Lock screen password. */
	public readonly lockScreenPassword					= new BehaviorSubject<string>('');

	/** Lock screen password confirmation. */
	public readonly lockScreenPasswordConfirm			= new BehaviorSubject<string>('');

	/** Minimum length of lock screen PIN/password. */
	public readonly lockScreenPasswordLength: number	= 4;

	/** Indicates whether the lock screen password is viable. */
	public readonly lockScreenPasswordReady: BehaviorSubject<boolean>;

	/** Lock screen PIN. */
	public readonly lockScreenPIN						= new BehaviorSubject<string>('');

	/** Master key (main account password). */
	public readonly masterKey							= new BehaviorSubject<string>('');

	/** Master key confirmation. */
	public readonly masterKeyConfirm					= new BehaviorSubject<string>('');

	/** Minimum length of custom master key. */
	public readonly masterKeyLength: number				= 20;

	/** Indicates whether the master key is viable. */
	public readonly masterKeyReady: BehaviorSubject<boolean>;

	/** Name. */
	public readonly name								= new BehaviorSubject<string>('');

	/** Indicates whether we're ready to initiate a registration attempt. */
	public readonly readyToSubmit: BehaviorSubject<boolean>;

	/** Sets a spoiler on generated master key. */
	public readonly spoiler								= new BehaviorSubject<boolean>(true);

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

	/** Total number of steps/tabs. */
	public readonly totalSteps: number					= 4;

	/** Indicates whether or not lockScreenPIN should be used in place of lockScreenPassword. */
	public readonly useLockScreenPIN					= new BehaviorSubject<boolean>(true);

	/** Username. */
	public readonly username: FormControl				= new FormControl('', undefined, [
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
	public readonly usernameMask						= usernameMask;

	/** Indicates whether or not xkcdPassphrase should be used. */
	public readonly useXkcdPassphrase					= new BehaviorSubject<boolean>(true);

	/** Watches username. */
	public readonly usernameWatcher: Observable<FormControl>	= combineLatest(
		this.username.statusChanges,
		this.username.valueChanges
	).pipe(
		map(() => this.username)
	);

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

		this.activatedRoute.params.subscribe(async o => {
			if (typeof o.step === 'string') {
				const step	= Number.parseInt(o.step, 10);

				/* Allow "step" parameter to double up as invite code */
				if (isNaN(step) && !this.inviteCode.value) {
					this.inviteCode.next(o.step);
				}
				else if (!isNaN(step) && step > 0 && step <= (this.totalSteps + 1)) {
					this.tabIndex.next(step - 1);
					return;
				}
			}

			this.router.navigate([accountRoot, 'register', '1']);
		});
	}

	/** Initiates registration attempt. */
	public async submit () : Promise<void> {
		if (!this.readyToSubmit.value) {
			this.checking.next(false);
			this.error.next(true);
			return;
		}

		this.checking.next(true);
		this.error.next(false);

		this.error.next(!(await this.accountAuthService.register(
			this.username.value,
			this.useXkcdPassphrase.value ?
				(await this.xkcdPassphrase.pipe(skip(1), take(1)).toPromise()) :
				this.masterKey.value
			,
			{
				isCustom: !this.useLockScreenPIN.value,
				value: this.useLockScreenPIN.value ?
					this.lockScreenPIN.value :
					this.lockScreenPassword.value
			},
			this.name.value,
			this.email.value,
			this.inviteCode.value
		)));

		this.checking.next(false);

		if (this.error.value) {
			return;
		}

		this.email.next('');
		this.lockScreenPassword.next('');
		this.lockScreenPasswordConfirm.next('');
		this.lockScreenPIN.next('');
		this.masterKey.next('');
		this.masterKeyConfirm.next('');
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

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		this.lockScreenPasswordReady	= toBehaviorSubject(
			combineLatest(
				this.lockScreenPassword,
				this.lockScreenPasswordConfirm,
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
						safeStringCompare(lockScreenPassword, lockScreenPasswordConfirm)
					)
			)),
			false
		);

		this.masterKeyReady				= toBehaviorSubject(
			combineLatest(
				this.masterKey,
				this.masterKeyConfirm,
				this.useXkcdPassphrase,
				this.xkcdPassphraseHasBeenViewed
			).pipe(map(([
				masterKey,
				masterKeyConfirm,
				useXkcdPassphrase,
				xkcdPassphraseHasBeenViewed
			]) =>
				useXkcdPassphrase ?
					xkcdPassphraseHasBeenViewed :
					(
						masterKey.length >= this.masterKeyLength &&
						safeStringCompare(masterKey, masterKeyConfirm)
					)
			)),
			false
		);

		this.readyToSubmit				= toBehaviorSubject(
			combineLatest(
				this.inviteCode,
				this.lockScreenPasswordReady,
				this.masterKeyReady,
				this.name,
				this.usernameWatcher
			).pipe(map(([
				inviteCode,
				lockScreenPasswordReady,
				masterKeyReady,
				name,
				username
			]) => !(
				!username.value ||
				username.errors ||
				!name ||
				!inviteCode ||
				!lockScreenPasswordReady ||
				!masterKeyReady
			))),
			false
		);
	}
}
