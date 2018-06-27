import {Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {SecurityModels, User} from '../../account';
import {IAsyncValue} from '../../iasync-value';
import {StringProto} from '../../proto';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {normalize} from '../../util/formatting';


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

	/** User. */
	public user?: User;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.transitionEnd();

		this.user	= (await this.accountDatabaseService.getCurrentUser()).user;

		const [email, {name, realUsername}]	= await Promise.all([
			this.email.getValue(),
			this.user.accountUserProfile.getValue()
		]);

		this.data.current	= {email, name, realUsername};
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
			normalize(this.data.modified.realUsername) === this.user.username
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
	) {}
}
