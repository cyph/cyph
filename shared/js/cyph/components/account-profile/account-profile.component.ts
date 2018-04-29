import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {combineLatest, Observable, of} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {UserPresence, userPresenceSelectOptions} from '../../account/enums';
import {User} from '../../account/user';
import {AccountUserTypes} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountOrganizationsService} from '../../services/account-organizations.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {trackByValue} from '../../track-by/track-by-value';
import {cacheObservable} from '../../util/flatten-observable';


/**
 * Angular component for account profile UI.
 */
@Component({
	selector: 'cyph-account-profile',
	styleUrls: ['./account-profile.component.scss'],
	templateUrl: './account-profile.component.html'
})
export class AccountProfileComponent implements OnDestroy, OnInit {
	/** @ignore */
	private destroyed: boolean		= false;

	/** @ignore */
	private editorFocus: boolean	= false;

	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** Current draft of user profile description. */
	public descriptionDraft: string	= '';

	/** @see AccountProfileComponent.doctorListOnly */
	public readonly doctorListOnly: Observable<boolean>			= cacheObservable(
		this.activatedRoute.data.pipe(map(o => o.doctorListOnly === true)),
		false
	);

	/** Profile edit mode. */
	public editMode: boolean		= false;

	/** Indicates whether this is home component. */
	@Input() public home: boolean	= false;

	/** @see AccountContactsService.watchIfContact */
	public isContact?: Observable<boolean>;

	/** Maximum length of profile description. */
	public readonly maxDescriptionLength: number	= 140;

	/** @see UserPresence */
	public readonly statuses: typeof userPresenceSelectOptions	= userPresenceSelectOptions;

	/** @see trackBySelf */
	public readonly trackBySelf: typeof trackBySelf		= trackBySelf;

	/** @see trackByValue */
	public readonly trackByValue: typeof trackByValue	= trackByValue;

	/** User profile. */
	public user?: User;

	/** List of members, if user is an organization. */
	public userMembers?: Observable<User[]>;

	/** User parent organization profile. */
	public userOrganiztion?: User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @ignore */
	private async setUser (username?: string) : Promise<void> {
		if (
			!this.accountDatabaseService.currentUser.value &&
			await this.accountAuthService.hasSavedCredentials()
		) {
			this.router.navigate(username ?
				[accountRoot, 'login'].
					concat(accountRoot ? [accountRoot] : []).
					concat(['profile', username])
				:
				[accountRoot, 'login'].concat(this.home ? [] : ['profile'])
			);
			return;
		}

		try {
			if (username) {
				this.isContact	= this.accountContactsService.watchIfContact(username);
				this.user		= await this.accountUserLookupService.getUser(username);
			}
			else if (this.accountDatabaseService.currentUser.value) {
				if (this.envService.isTelehealth) {
					const userType	=
						await this.accountDatabaseService.currentUser.value.user.userType.pipe(
							take(1)
						).toPromise()
					;

					if (
						this.envService.environment.customBuild &&
						this.envService.environment.customBuild.config.organization &&
						this.home &&
						userType === AccountUserTypes.Standard
					) {
						this.router.navigate([
							accountRoot,
							'doctors'
						]);
						return;
					}
				}

				this.isContact	= of(false);
				this.user		= this.accountDatabaseService.currentUser.value.user;
			}
		}
		catch {}

		if (this.user) {
			this.userMembers		= this.accountOrganizationsService.getMembers(this.user);

			this.userOrganiztion	=
				await this.accountOrganizationsService.getOrganization(this.user)
			;

			await this.user.fetch();

			if (!this.destroyed) {
				await this.accountService.setHeader(this.user);
			}

			this.accountService.resolveUiReady();
		}
		else {
			this.userMembers		= undefined;
			this.userOrganiztion	= undefined;

			this.router.navigate([accountRoot, username ? '404' : 'login']);
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
	public ngOnDestroy () : void {
		this.destroyed	= true;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.transitionEnd();

		combineLatest(
			this.activatedRoute.params,
			this.doctorListOnly
		).subscribe(async ([params, doctorListOnly]: [{username?: string}, boolean]) => {
			/* Temporary workaround for listing doctors */
			if (
				doctorListOnly &&
				this.envService.environment.customBuild &&
				this.envService.environment.customBuild.config.organization
			) {
				await this.setUser(this.envService.environment.customBuild.config.organization);
			}
			else {
				await this.setUser(params.username);
			}
		});
	}

	/** Publishes new user description. */
	public async saveUserDescription () : Promise<void> {
		if (!this.user || !this.isCurrentUser) {
			throw new Error("Cannot modify another user's description.");
		}

		const draft		= this.descriptionDraft.trim();
		const profile	= await this.user.accountUserProfile.getValue();

		if (profile.description !== draft) {
			this.accountService.interstitial	= true;
			profile.description					= draft;
			await this.user.accountUserProfile.setValue(profile);
		}

		this.accountService.interstitial	= false;
		this.editMode						= false;
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountOrganizationsService */
		public readonly accountOrganizationsService: AccountOrganizationsService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
