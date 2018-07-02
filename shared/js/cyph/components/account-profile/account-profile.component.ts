import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {combineLatest, Observable, of} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {UserPresence, userPresenceSelectOptions} from '../../account/enums';
import {User} from '../../account/user';
import {AccountUserTypes, BlobProto, DataURIProto, IForm} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountOrganizationsService} from '../../services/account-organizations.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EHRService} from '../../services/ehr.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {trackByValue} from '../../track-by/track-by-value';
import {cacheObservable} from '../../util/flatten-observable';
import {urlToSafeStyle} from '../../util/safe-values';
import {deserialize, serialize} from '../../util/serialization';


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

	/** Current draft of user profile. */
	public draft: {
		avatar?: Blob;
		coverImage?: Blob;
		description?: string;
		forms?: IForm[];
		name?: string;
	}	= {};

	/** @see AccountProfileComponent.doctorListOnly */
	public readonly doctorListOnly: Observable<boolean>			= cacheObservable(
		this.activatedRoute.data.pipe(map(o => o.doctorListOnly === true))
	);

	/** Profile edit mode. */
	public editMode: boolean		= false;

	/** Gets data URI of file. */
	public readonly getDataURI		= memoize(async (file?: Blob) =>
		!file ? undefined : deserialize(DataURIProto, await serialize(BlobProto, file))
	);

	/** Indicates whether this is home component. */
	@Input() public home: boolean	= false;

	/** @see AccountContactsService.watchIfContact */
	public isContact?: Observable<boolean>;

	/** @see UserPresence */
	public readonly statuses: typeof userPresenceSelectOptions	= userPresenceSelectOptions;

	/** @see trackBySelf */
	public readonly trackBySelf: typeof trackBySelf				= trackBySelf;

	/** @see trackByValue */
	public readonly trackByValue: typeof trackByValue			= trackByValue;

	/** @see urlToSafeStyle */
	public readonly urlToSafeStyle: typeof urlToSafeStyle		= urlToSafeStyle;

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
		try {
			if (username) {
				this.isContact	= this.accountContactsService.watchIfContact(username);
				this.user		= await this.accountUserLookupService.getUser(username, false);
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

	/** Indicates whether profile is ready to save. */
	public get readyToSave () : boolean {
		return (
			this.draft.avatar !== undefined ||
			this.draft.coverImage !== undefined ||
			this.draft.description !== undefined ||
			this.draft.forms !== undefined ||
			this.draft.name !== undefined
		) && (
			this.draft.description === undefined ||
			this.draft.description.length <= this.accountService.maxDescriptionLength
		) && (
			this.draft.name === undefined ||
			this.draft.name.length <= this.accountService.maxNameLength
		);
	}

	/** Publishes new user description. */
	public async saveProfile (draft?: {
		avatar?: Blob;
		coverImage?: Blob;
		description?: string;
		forms?: IForm[];
	}) : Promise<void> {
		const user	= this.user;

		if (!user || !this.isCurrentUser) {
			throw new Error("Cannot modify another user's description.");
		}

		this.accountService.interstitial	= true;

		const {
			avatar,
			coverImage,
			description,
			forms,
			name
		}	= !draft ?
			this.draft :
			{...this.draft, ...draft}
		;

		await Promise.all([
			avatar === undefined ?
				undefined :
				this.accountSettingsService.setAvatar(avatar)
			,
			coverImage === undefined ?
				undefined :
				this.accountSettingsService.setCoverImage(coverImage)
			,
			(async () => {
				if (description === undefined && name === undefined) {
					return;
				}

				let descriptionTrimmed	=
					description !== undefined ?
						description.trim().slice(0, this.accountService.maxDescriptionLength) :
						undefined
				;

				let nameTrimmed			=
					name !== undefined ?
						name.trim().slice(0, this.accountService.maxNameLength) :
						undefined
				;

				await user.accountUserProfile.updateValue(async o => {
					if (descriptionTrimmed === undefined) {
						descriptionTrimmed	= o.description;
					}

					if (nameTrimmed === undefined) {
						nameTrimmed	= o.name;
					}

					if (o.description === descriptionTrimmed && o.name === nameTrimmed) {
						throw new Error();
					}

					return {...o, description: descriptionTrimmed, name: nameTrimmed};
				});
			})(),
			forms === undefined ?
				undefined :
				user.accountUserProfileExtra.updateValue(async o => ({...o, forms}))
		]);

		this.accountService.interstitial	= false;
		this.setEditMode(false);
	}

	/** Crops and sets avatar. */
	public async setAvatar (avatar?: File) : Promise<void> {
		if (!avatar || !this.editMode) {
			return;
		}

		const title	= avatar.name;
		const src	= await this.getDataURI(avatar);

		if (!src || !this.editMode) {
			return;
		}

		const dataURI	= await this.dialogService.cropImage({aspectRatio: 1, src, title});

		if (!dataURI || !this.editMode) {
			return;
		}

		const cropped	= await deserialize(BlobProto, await serialize(DataURIProto, dataURI));

		if (!this.editMode) {
			return;
		}

		this.draft.avatar	= cropped;
	}

	/** Sets edit mode. */
	public setEditMode (editMode: boolean) : void {
		this.draft		= {};
		this.editMode	= editMode;
	}

	/** Shares medical data from EHR system with the patient. */
	public async shareEhrData () : Promise<void> {
		const user	= this.user;

		if (!user || !(await this.dialogService.confirm({
			content: this.stringsService.shareEhrData,
			title: this.stringsService.shareEhrDataTitle
		}))) {
			return;
		}

		this.accountService.interstitial	= true;

		let alertPromise	= Promise.resolve();

		try {
			/* TODO: Allow doctor to use PatientInfo for this. */
			const [{apiKey}, accountUserProfile]	= await Promise.all([
				this.accountFilesService.getEhrApiKey(),
				user.accountUserProfile.getValue()
			]);

			const firstSpaceIndex	= accountUserProfile.name.indexOf(' ');
			const lastSpaceIndex	= accountUserProfile.name.lastIndexOf(' ');

			const redoxPatient	= await this.ehrService.getPatient(apiKey, {
				Demographics: {
					FirstName: firstSpaceIndex > -1 ?
						accountUserProfile.name.slice(0, firstSpaceIndex) :
						accountUserProfile.name
					,
					LastName: firstSpaceIndex > -1 ?
						accountUserProfile.name.slice(lastSpaceIndex + 1) :
						''
					,
					MiddleName: firstSpaceIndex > -1 ?
						accountUserProfile.name.slice(firstSpaceIndex + 1, lastSpaceIndex) :
						''
				}
			});

			await this.accountFilesService.upload(
				accountUserProfile.name,
				redoxPatient,
				user.username
			).result;

			alertPromise	= this.dialogService.alert({
				content: this.stringsService.shareEhrDataSuccess,
				title: this.stringsService.shareEhrDataTitle
			});
		}
		catch (_) {
			alertPromise	= this.dialogService.alert({
				content: this.stringsService.shareEhrDataFailure,
				title: this.stringsService.shareEhrDataTitle
			});
		}
		finally {
			this.accountService.interstitial	= false;
			await alertPromise;
		}
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly ehrService: EHRService,

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
