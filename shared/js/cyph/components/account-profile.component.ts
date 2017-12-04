import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs/Observable';
import {of} from 'rxjs/observable/of';
import {UserPresence, userPresenceSelectOptions} from '../account/enums';
import {User} from '../account/user';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account profile UI.
 */
@Component({
	selector: 'cyph-account-profile',
	styleUrls: ['../../../css/components/account-profile.scss'],
	templateUrl: '../../../templates/account-profile.html'
})
export class AccountProfileComponent implements OnInit {
	/** @ignore */
	private editorFocus: boolean	= false;

	/** Current draft of user profile description. */
	public descriptionDraft: string	= '';

	/** Profile edit mode. */
	public editMode: boolean		= false;

	/** @see AccountContactsService.watchIfContact */
	public isContact?: Observable<boolean>;

	/** Maximum length of profile description. */
	public readonly maxDescriptionLength: number	= 140;

	/** @see UserPresence */
	public readonly statuses: typeof userPresenceSelectOptions	= userPresenceSelectOptions;

	/** User profile. */
	public user?: User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @ignore */
	private async setUser (username?: string) : Promise<void> {
		if (
			!this.accountDatabaseService.currentUser.value &&
			await this.accountAuthService.hasSavedCredentials()
		) {
			this.routerService.navigate(username ?
				['account', 'login', 'profile', username] :
				['account', 'login']
			);
			return;
		}

		try {
			if (username) {
				this.isContact	= this.accountContactsService.watchIfContact(username);
				this.user		= await this.accountUserLookupService.getUser(username);
			}
			else if (this.accountDatabaseService.currentUser.value) {
				this.isContact	= of(false);
				this.user		= this.accountDatabaseService.currentUser.value.user;
			}
		}
		catch (_) {}

		if (!this.user) {
			this.routerService.navigate(['account', 'login']);
		}
	}

	/** Indicates whether this is the profile of the currently signed in user. */
	public get isCurrentUser () : boolean {
		return (
			this.accountDatabaseService.currentUser.value !== undefined &&
			this.user === this.accountDatabaseService.currentUser.value.user
		);
	}

	/** Indicates whether the profile editor is in focus. */
	public get isEditorFocused () : boolean {
		return this.editorFocus && this.editMode;
	}

	public set isEditorFocused (value: boolean) {
		this.editorFocus	= value;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.activatedRouteService.params.subscribe(o => { this.setUser(o.username); });
	}

	/** Publishes new user description. */
	public async saveUserDescription () : Promise<void> {
		if (!this.user || !this.isCurrentUser) {
			throw new Error("Cannot modify another user's description.");
		}

		const draft	= this.descriptionDraft.trim();

		if (draft) {
			const profile	= await this.user.accountUserProfile.getValue();

			if (profile.description !== draft) {
				this.accountService.interstitial	= true;
				profile.description					= draft;
				await this.user.accountUserProfile.setValue(profile);
			}
		}

		this.accountService.interstitial	= false;
		this.editMode						= false;
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly routerService: Router,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
