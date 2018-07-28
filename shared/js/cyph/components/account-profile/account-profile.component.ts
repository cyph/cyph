import {ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
import {map, mergeMap, take} from 'rxjs/operators';
import {UserPresence, userPresenceSelectOptions} from '../../account/enums';
import {User} from '../../account/user';
import {IFile} from '../../ifile';
import {AccountUserTypes, DataURIProto, IForm} from '../../proto';
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
import {cacheObservable, toBehaviorSubject} from '../../util/flatten-observable';
import {urlToSafeStyle} from '../../util/safe-values';
import {deserialize, serialize} from '../../util/serialization';


/**
 * Angular component for account profile UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-profile',
	styleUrls: ['./account-profile.component.scss'],
	templateUrl: './account-profile.component.html'
})
export class AccountProfileComponent implements OnDestroy, OnInit {
	/** @ignore */
	private destroyed: boolean	= false;

	/** Indicates whether speed dial is open. */
	public readonly isSpeedDialOpen						= new BehaviorSubject<boolean>(false);

	/** @ignore */
	private readonly userInternal: Observable<{
		isCurrentUser: boolean;
		user?: User;
		username?: string;
	}>;

	/** @ignore */
	private readonly username: Observable<string|undefined>;

	/** @see AccountUserTypes */
	public readonly accountUserTypes					= AccountUserTypes;

	/** Current draft of user profile. */
	public readonly draft								= new BehaviorSubject<{
		avatar?: IFile;
		coverImage?: IFile;
		description?: string;
		forms?: IForm[];
		name?: string;
	}>(
		{}
	);

	/** @see AccountProfileComponent.doctorListOnly */
	public readonly doctorListOnly: Observable<boolean>	= cacheObservable(
		this.activatedRoute.data.pipe(map(o => o.doctorListOnly === true))
	);

	/** Profile edit mode. */
	public readonly editMode							= new BehaviorSubject<boolean>(false);

	/** Gets data URI of file. */
	public readonly getDataURI							= memoize(async (file?: IFile) =>
		!file ? undefined : deserialize(DataURIProto, file.data)
	);

	/** Indicates whether this is home component. */
	@Input() public home: boolean						= false;

	/** @see AccountContactsService.watchIfContact */
	public readonly isContact: Observable<boolean>;

	/** Indicates whether this is the profile of the currently signed in user. */
	public readonly isCurrentUser: Observable<boolean>;

	/** Indicates whether the profile editor is in focus. */
	public readonly isEditorFocused						= new BehaviorSubject<boolean>(false);

	/** Indicates whether profile is ready to save. */
	public readonly readyToSave: Observable<boolean>	= this.draft.pipe(map(draft =>
		(
			draft.avatar !== undefined ||
			draft.coverImage !== undefined ||
			draft.description !== undefined ||
			draft.forms !== undefined ||
			draft.name !== undefined
		) && (
			draft.description === undefined ||
			draft.description.length <= this.accountService.maxDescriptionLength
		) && (
			draft.name === undefined ||
			draft.name.length <= this.accountService.maxNameLength
		)
	));

	/** @see UserPresence */
	public readonly statuses							= userPresenceSelectOptions;

	/** @see trackBySelf */
	public readonly trackBySelf							= trackBySelf;

	/** @see trackByValue */
	public readonly trackByValue						= trackByValue;

	/** @see urlToSafeStyle */
	public readonly urlToSafeStyle						= urlToSafeStyle;

	/** List of members, if user is an organization. */
	public readonly userMembers: Observable<User[]|undefined>;

	/** User parent organization profile. */
	public readonly userOrganiztion: Observable<User|undefined>;

	/** @see UserPresence */
	public readonly userPresence						= UserPresence;

	/** User profile. */
	public readonly userProfile: BehaviorSubject<User|undefined>;

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.destroyed	= true;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.transitionEnd();

		this.userInternal.subscribe(async ({user, username}) => {
			if (
				!username &&
				this.envService.isTelehealth &&
				this.envService.environment.customBuild &&
				this.envService.environment.customBuild.config.organization &&
				this.home &&
				this.accountDatabaseService.currentUser.value &&
				(
					await this.accountDatabaseService.currentUser.value.user.userType.pipe(
						take(1)
					).toPromise()
				) === AccountUserTypes.Standard
			) {
				/* Redirect telehealth patient home page to /doctors */
				this.router.navigate([accountRoot, 'doctors']);
			}
			else if (user) {
				await user.fetch();

				if (!this.destroyed) {
					await this.accountService.setHeader(user);
				}

				this.accountService.resolveUiReady();
			}
			else {
				this.router.navigate([accountRoot, username ? '404' : 'login']);
			}
		});
	}

	/** Publishes new user description. */
	public async saveProfile (draft?: {
		avatar?: IFile;
		coverImage?: IFile;
		description?: string;
		forms?: IForm[];
	}) : Promise<void> {
		const user	= this.userProfile.value;

		if (!user || !this.isCurrentUser) {
			throw new Error("Cannot modify another user's description.");
		}

		this.accountService.interstitial.next(true);

		const {
			avatar,
			coverImage,
			description,
			forms,
			name
		}	= !draft ?
			this.draft.value :
			{...this.draft.value, ...draft}
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

		this.accountService.interstitial.next(false);
		this.setEditMode(false);
	}

	/** Crops and sets avatar. */
	public async setAvatar (avatar?: IFile) : Promise<void> {
		if (!avatar || !this.editMode.value) {
			return;
		}

		const title	= avatar.name;
		const src	= await this.getDataURI(avatar);

		if (!src || !this.editMode.value) {
			return;
		}

		const dataURI	= await this.dialogService.cropImage({aspectRatio: 1, src, title});

		if (!dataURI || !this.editMode.value) {
			return;
		}

		const cropped	= await serialize(DataURIProto, dataURI);

		if (!this.editMode.value) {
			return;
		}

		this.updateDraft({avatar: {...avatar, data: cropped}});
	}

	/** Sets edit mode. */
	public setEditMode (editMode: boolean) : void {
		this.draft.next({});
		this.editMode.next(editMode);
	}

	/** Shares medical data from EHR system with the patient. */
	public async shareEhrData () : Promise<void> {
		const user	= this.userProfile.value;

		if (!user || !(await this.dialogService.confirm({
			content: this.stringsService.shareEhrData,
			title: this.stringsService.shareEhrDataTitle
		}))) {
			return;
		}

		this.accountService.interstitial.next(true);

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
			this.accountService.interstitial.next(false);
			await alertPromise;
		}
	}

	/** Updates draft. */
	public updateDraft (draft: {
		avatar?: IFile;
		coverImage?: IFile;
		description?: string;
		forms?: IForm[];
		name?: string;
	}) : void {
		this.draft.next({...this.draft.value, ...draft});
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
	) {
		this.username			= combineLatest(
			this.activatedRoute.params,
			this.doctorListOnly
		).pipe(map(([params, doctorListOnly]: [{username?: string}, boolean]) =>
			/* Temporary workaround for listing doctors */
			(
				doctorListOnly &&
				this.envService.environment.customBuild &&
				this.envService.environment.customBuild.config.organization
			) ?
				this.envService.environment.customBuild.config.organization :
				params.username
		));

		this.userInternal		= cacheObservable(combineLatest(
			this.username,
			this.accountDatabaseService.currentUser
		).pipe(mergeMap(async ([username, currentUser]) =>
			username ?
				{
					isCurrentUser: false,
					user: await this.accountUserLookupService.getUser(username, false),
					username
				} :
			currentUser ?
				{
					isCurrentUser: true,
					user: currentUser.user,
					username
				} :
				{
					isCurrentUser: false,
					username
				}
		)));

		this.userProfile		= toBehaviorSubject(
			this.userInternal.pipe(map(o => o.user)),
			undefined
		);

		this.userMembers		= toBehaviorSubject(
			this.userProfile.pipe(mergeMap(user =>
				user ? this.accountOrganizationsService.getMembers(user) : of(undefined)
			)),
			undefined
		);

		this.userOrganiztion	= toBehaviorSubject(
			this.userProfile.pipe(mergeMap(async user =>
				user ? this.accountOrganizationsService.getOrganization(user) : undefined
			)),
			undefined
		);

		this.isContact			= toBehaviorSubject(
			this.username.pipe(mergeMap(username =>
				username ? this.accountContactsService.watchIfContact(username) : of(false)
			)),
			false
		);

		this.isCurrentUser		= toBehaviorSubject(
			this.userInternal.pipe(map(o => o.isCurrentUser)),
			false
		);
	}
}
