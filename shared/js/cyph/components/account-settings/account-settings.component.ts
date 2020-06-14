import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	ViewChild
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {SecurityModels, User, usernameMask} from '../../account';
import {BaseProvider} from '../../base-provider';
import {InAppPurchaseComponent} from '../../components/in-app-purchase';
import {emailPattern} from '../../email-pattern';
import {BooleanProto, CyphPlans, StringProto} from '../../proto';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {ConfigService} from '../../services/config.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {SalesService} from '../../services/sales.service';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {observableAll} from '../../util/observable-all';
import {titleize} from '../../util/titleize';
import {reloadWindow} from '../../util/window';

/**
 * Angular component for account settings UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-settings',
	styleUrls: ['./account-settings.component.scss'],
	templateUrl: './account-settings.component.html'
})
export class AccountSettingsComponent extends BaseProvider implements OnInit {
	/** @see CyphPlans */
	public readonly cyphPlans = CyphPlans;

	/** Data. */
	public readonly data = new BehaviorSubject({
		current: {
			email: '',
			name: '',
			profileVisible: false,
			realUsername: ''
		},
		modified: {
			email: '',
			name: '',
			profileVisible: false,
			realUsername: ''
		},
		usernamePattern: ''
	});

	/** Email address. */
	public readonly email = this.accountDatabaseService.getAsyncValue(
		'email',
		StringProto,
		SecurityModels.unprotected,
		undefined,
		undefined,
		undefined,
		this.subscriptions
	);

	/** @see emailPattern */
	public readonly emailPattern = emailPattern;

	/** Gets session data to activate new device. */
	public readonly getNewDeviceSessionData = memoize(
		async () =>
			this.user.value?.username ?
				{
					aliceMasterKey: await this.accountAuthService.getAltMasterKey(),
					bobSessionID: undefined,
					username: this.user.value.username
				} :
				undefined,
		() => this.user.value?.username
	);

	/** @see InAppPurchaseComponent */
	@ViewChild(InAppPurchaseComponent)
	public inAppPurchase?: InAppPurchaseComponent;

	/** Indicates whether page is loading. */
	public readonly loading = new BehaviorSubject<boolean>(true);

	/** Indicates whether profile is visible to anonymous users. */
	public readonly profileVisible = this.accountDatabaseService.getAsyncValue(
		'profileVisible',
		BooleanProto,
		SecurityModels.unprotected,
		undefined,
		undefined,
		undefined,
		this.subscriptions
	);

	/** Indicates whether data is ready to save. */
	public readonly ready: BehaviorSubject<boolean>;

	/** UI state. */
	public readonly state = this.activatedRoute.data.pipe(
		map(o => (typeof o.state === 'number' ? o.state : this.states.default))
	);

	/** UI states. */
	public readonly states = {
		default: 1,
		masterKey: 2,
		newDeviceActivation: 3,
		pin: 4
	};

	/** @see titleize */
	public readonly titleize = titleize;

	/** @see trackByID */
	public readonly trackByID = trackByID;

	/** User. */
	public readonly user = new BehaviorSubject<User | undefined>(undefined);

	/** @see usernameMask */
	public readonly usernameMask = usernameMask;

	/** @ignore */
	private async changePasswordInternal<T> (
		password: T,
		requiredState: number,
		dialogConfig: {content: string; failureContent: string; title: string},
		changePassword: (password: T) => Promise<void>
	) : Promise<void> {
		const user = this.user.value;
		if (
			!user ||
			(await this.state.pipe(take(1)).toPromise()) !== requiredState
		) {
			return;
		}

		if (
			!(await this.dialogService.confirm({
				content: dialogConfig.content,
				markdown: true,
				title: dialogConfig.title
			}))
		) {
			return;
		}

		this.loading.next(true);

		try {
			await changePassword(password);
		}
		catch {
			await this.dialogService.alert({
				content: dialogConfig.failureContent,
				markdown: true,
				title: dialogConfig.title
			});
		}

		this.router.navigate(['settings']);
		this.loading.next(false);
	}

	/** Saves master key update. */
	public async changeMasterKey (masterKey: string) : Promise<void> {
		await this.changePasswordInternal(
			masterKey,
			this.states.masterKey,
			{
				content: this.stringsService.changeMasterKeyContent,
				failureContent: this.stringsService.changeMasterKeyFailure,
				title: this.stringsService.changeMasterKeyTitle
			},
			async p => this.accountAuthService.changeMasterKey(p)
		);

		reloadWindow();
	}

	/** Saves lock screen password update. */
	public async changePIN (
		pin:
			| {
					isCustom: boolean;
					value: string;
			  }
			| undefined
	) : Promise<void> {
		if (pin === undefined) {
			return;
		}

		return this.changePasswordInternal(
			pin,
			this.states.pin,
			{
				content: this.stringsService.changePinContent,
				failureContent: this.stringsService.changePinFailure,
				title: this.stringsService.changePinTitle
			},
			async p => this.accountAuthService.changePIN(p)
		);
	}

	/** New device activation completion handler. */
	public async newDeviceActivationComplete (
		success: boolean
	) : Promise<void> {
		await this.router.navigate(['settings']);

		await this.dialogService.toast(
			success ?
				this.stringsService.newDeviceActivationConfirmation :
				this.stringsService.newDeviceActivationFailure,
			undefined,
			this.stringsService.ok
		);
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.transitionEnd();

		const {user} = await this.accountDatabaseService.getCurrentUser();

		this.user.next(user);

		const [
			email,
			profileVisible,
			{name, realUsername}
		] = await Promise.all([
			this.email.getValue(),
			this.profileVisible.getValue(),
			user.accountUserProfile.getValue(),
			this.accountService.getUserToken()
		]);

		const current = {
			email,
			name,
			profileVisible,
			realUsername:
				realUsername.toLowerCase() === user.username ?
					realUsername :
					user.username
		};

		this.updateData({
			current,
			modified: current,
			usernamePattern: user.username
				.split('')
				.map(c => `[${c.toUpperCase()}${c}]`)
				.join('')
		});

		this.loading.next(false);
	}

	/** Saves data updates. */
	public async save () : Promise<void> {
		const user = this.user.value;
		if (!user || !this.ready.value) {
			return;
		}

		this.loading.next(true);

		const data = this.data.value;
		const email = data.modified.email.trim();
		const name = data.modified.name.trim();
		const profileVisible = data.modified.profileVisible;
		const realUsername = data.modified.realUsername.trim();

		await Promise.all([
			data.current.email === email ?
				undefined :
				this.email.setValue(email),
			data.current.profileVisible === profileVisible ?
				undefined :
				this.profileVisible.setValue(profileVisible),
			data.current.name === name &&
			data.current.realUsername === realUsername ?
				undefined :
				user.accountUserProfile.updateValue(async o => ({
					...o,
					name,
					realUsername
				}))
		]);

		this.updateData({current: {email, name, profileVisible, realUsername}});

		this.loading.next(false);
	}

	/** Updates draft. */
	public updateData (data: {
		current?: {
			email?: string;
			name?: string;
			profileVisible?: boolean;
			realUsername?: string;
		};
		modified?: {
			email?: string;
			name?: string;
			profileVisible?: boolean;
			realUsername?: string;
		};
		usernamePattern?: string;
	}) : void {
		this.data.next({
			current: {
				...this.data.value.current,
				...data.current
			},
			modified: {
				...this.data.value.modified,
				...data.modified
			},
			usernamePattern:
				data.usernamePattern || this.data.value.usernamePattern
		});
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SalesService */
		public readonly salesService: SalesService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.ready = toBehaviorSubject(
			observableAll([this.data, this.user]).pipe(
				map(
					([data, user]) =>
						!!user &&
						(data.current.email !== data.modified.email ||
							data.current.name !== data.modified.name ||
							data.current.profileVisible !==
								data.modified.profileVisible ||
							data.current.realUsername !==
								data.modified.realUsername) &&
						!!data.modified.name &&
						data.modified.realUsername.toLowerCase() ===
							user.username
				)
			),
			false,
			this.subscriptions
		);
	}
}
