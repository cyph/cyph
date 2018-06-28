import {Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {SecurityModels, User, usernameMask} from '../../account';
import {IAsyncValue} from '../../iasync-value';
import {StringProto} from '../../proto';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account settings UI.
 */
@Component({
	selector: 'cyph-account-settings',
	styleUrls: ['./account-settings.component.scss'],
	templateUrl: './account-settings.component.html'
})
export class AccountSettingsComponent implements OnInit {
	/** Data. */
	public readonly data	= {
		current: {
			email: '',
			name: '',
			realUsername: ''
		},
		modified: {
			email: '',
			name: '',
			realUsername: ''
		}
	};

	/** Email address. */
	public readonly email: IAsyncValue<string>	= this.accountDatabaseService.getAsyncValue(
		'email',
		StringProto,
		SecurityModels.unprotected
	);

	/** Indicates whether page is loading. */
	public readonly loading: BehaviorSubject<boolean>	= new BehaviorSubject(true);

	/** UI state. */
	public state: number;

	/** UI states. */
	public readonly states	= {
		default: 1,
		masterKey: 2,
		pin: 3
	};

	/** User. */
	public user?: User;

	/** @see usernameMask */
	public readonly usernameMask: typeof usernameMask	= usernameMask;

	/** @ignore */
	private async changePasswordInternal <T> (
		password: T,
		requiredState: number,
		dialogConfig: {content: string; title: string},
		changePassword: (password: T) => Promise<void>
	) : Promise<void> {
		const user	= this.user;
		if (!user || this.state !== requiredState) {
			return;
		}

		if (!(await this.dialogService.confirm({...dialogConfig, markdown: true}))) {
			return;
		}

		this.loading.next(true);
		await changePassword(password);
		this.state	= this.states.default;
		this.loading.next(false);
	}

	/** Saves master key update. */
	public async changeMasterKey (masterKey: string) : Promise<void> {
		return this.changePasswordInternal(
			masterKey,
			this.states.masterKey,
			{
				content: this.stringsService.changeMasterKeyContent,
				title: this.stringsService.changeMasterKeyTitle
			},
			async p => this.accountAuthService.changeMasterKey(p)
		);
	}

	/** Saves lock screen password update. */
	public async changePIN (pin: {isCustom: boolean; value: string}) : Promise<void> {
		return this.changePasswordInternal(
			pin,
			this.states.pin,
			{
				content: this.stringsService.changePinContent,
				title: this.stringsService.changePinTitle
			},
			async p => this.accountAuthService.changePIN(p)
		);
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.transitionEnd();

		this.user	= (await this.accountDatabaseService.getCurrentUser()).user;

		const [email, {name, realUsername}]	= await Promise.all([
			this.email.getValue(),
			this.user.accountUserProfile.getValue()
		]);

		this.data.current	= {
			email,
			name,
			realUsername: realUsername.toLowerCase() === this.user.username ?
				realUsername :
				this.user.username
		};

		this.data.modified	= {...this.data.current};

		this.loading.next(false);
	}

	/** Indicates whether data is ready to save. */
	public get ready () : boolean {
		return (
			!!this.user &&
			(
				this.data.current.email !== this.data.modified.email ||
				this.data.current.name !== this.data.modified.name ||
				this.data.current.realUsername !== this.data.modified.realUsername
			) &&
			!!this.data.modified.name &&
			this.data.modified.realUsername.toLowerCase() === this.user.username
		);
	}

	/** Saves data updates. */
	public async save () : Promise<void> {
		const user	= this.user;
		if (!user || !this.ready) {
			return;
		}

		this.loading.next(true);

		const email			= this.data.modified.email.trim();
		const name			= this.data.modified.name.trim();
		const realUsername	= this.data.modified.realUsername.trim();

		await Promise.all([
			this.data.current.email === email ?
				undefined :
				this.email.setValue(email)
			,
			this.data.current.name === name && this.data.current.realUsername === realUsername ?
				undefined :
				user.accountUserProfile.updateValue(async o => ({...o, name, realUsername}))
		]);

		this.data.current	= {email, name, realUsername};

		this.loading.next(false);
	}

	constructor (
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

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		this.state	= this.states.default;
	}
}
