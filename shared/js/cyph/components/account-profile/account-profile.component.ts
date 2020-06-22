/* eslint-disable max-lines */

import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {map, switchMap, take} from 'rxjs/operators';
import {
	SecurityModels,
	User,
	UserPresence,
	userPresenceSelectOptions
} from '../../account';
import {BaseProvider} from '../../base-provider';
import {PGPPublicKeyComponent} from '../../components/pgp-public-key';
import {
	doctorProfile,
	patientProfile,
	telehealthOrgProfile,
	telehealthStaffProfile
} from '../../forms';
import {IFile} from '../../ifile';
import {AccountUserTypes, BooleanProto, DataURIProto, IForm} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountOrganizationsService} from '../../services/account-organizations.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {PGPService} from '../../services/crypto/pgp.service';
import {DialogService} from '../../services/dialog.service';
import {EHRService} from '../../services/ehr.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {trackByValue} from '../../track-by/track-by-value';
import {
	cacheObservable,
	toBehaviorSubject
} from '../../util/flatten-observable';
import {normalize} from '../../util/formatting';
import {observableAll} from '../../util/observable-all';
import {urlToSafeStyle} from '../../util/safe-values';
import {serialize} from '../../util/serialization';

/**
 * Angular component for account profile UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-profile',
	styleUrls: ['./account-profile.component.scss'],
	templateUrl: './account-profile.component.html'
})
export class AccountProfileComponent extends BaseProvider implements OnInit {
	/** @ignore */
	private readonly userInternal: Observable<{
		isCurrentUser: boolean;
		user?: User;
		username?: string;
	}>;

	/** @ignore */
	private readonly username: Observable<string | undefined>;

	/** @see AccountUserTypes */
	public readonly accountUserTypes = AccountUserTypes;

	/** Current draft of user profile. */
	public readonly draft = new BehaviorSubject<{
		avatar?: IFile;
		coverImage?: IFile;
		description?: string;
		forms?: IForm[];
		name?: string;
	}>({});

	/** @see AccountProfileComponent.doctorListOnly */
	public readonly doctorListOnly: Observable<boolean> = cacheObservable(
		this.activatedRoute.data.pipe(map(o => o.doctorListOnly === true)),
		this.subscriptions
	);

	/** Profile edit mode. */
	public readonly editMode: BehaviorSubject<boolean> = toBehaviorSubject(
		this.accountService.routeChanges.pipe(
			map(url => url.split('/').slice(-1)[0] === 'edit')
		),
		false,
		this.subscriptions
	);

	/** Gets data URI of file. */
	public readonly getDataURI = memoize(async (file?: IFile) =>
		!file ? undefined : DataURIProto.decode(file.data, file.mediaType)
	);

	/** Indicates whether this is home component. */
	@Input() public home: boolean = false;

	/** @see AccountContactsService.watchIfContact */
	public readonly isContact: Observable<boolean>;

	/** Indicates whether this is the profile of the currently signed in user. */
	public readonly isCurrentUser: BehaviorSubject<boolean>;

	/** Indicates whether the profile editor is in focus. */
	public readonly isEditorFocused = new BehaviorSubject<boolean>(false);

	/** Indicates whether profile is ready to save. */
	public readonly readyToSave: Observable<boolean> = this.draft.pipe(
		map(
			draft =>
				(draft.avatar !== undefined ||
					draft.coverImage !== undefined ||
					draft.description !== undefined ||
					draft.forms !== undefined ||
					draft.name !== undefined) &&
				(draft.description === undefined ||
					draft.description.length <=
						this.accountService.maxDescriptionLength) &&
				(draft.name === undefined ||
					draft.name.length <= this.accountService.maxNameLength)
		)
	);

	/** @see UserPresence */
	public readonly statuses = userPresenceSelectOptions;

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @see trackByValue */
	public readonly trackByValue = trackByValue;

	/** @see urlToSafeStyle */
	public readonly urlToSafeStyle = urlToSafeStyle;

	/** List of members, if user is an organization. */
	public readonly userMembers: Observable<User[]>;

	/** User parent organization profile. */
	public readonly userOrganiztion: Observable<User | undefined>;

	/** @see UserPresence */
	public readonly userPresence = UserPresence;

	/** User profile. */
	public readonly userProfile: BehaviorSubject<User | undefined>;

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();

		this.subscriptions.push(
			this.userInternal.subscribe(async ({user, username}) => {
				const normalizedUsername = username ?
					normalize(username) :
					username;

				if (username !== normalizedUsername) {
					this.router.navigate(['profile', normalizedUsername], {
						replaceUrl: true
					});
				}
				else if (
					this.accountDatabaseService.currentUser.value &&
					this.accountDatabaseService.currentUser.value.user
						.username === username
				) {
					this.router.navigate(['profile'], {replaceUrl: true});
				}
				else if (
					!username &&
					this.envService.isTelehealth &&
					this.envService.environment.customBuild &&
					this.envService.environment.customBuild.config
						.organization &&
					this.home &&
					this.accountDatabaseService.currentUser.value &&
					(await this.accountDatabaseService.currentUser.value.user.userType
						.pipe(take(1))
						.toPromise()) === AccountUserTypes.Standard
				) {
					/* Redirect telehealth patient home page to /doctors */
					this.router.navigate(['doctors']);
				}
				else if (user) {
					/* Hide non-visible profiles from anonymous users */
					if (
						!this.accountDatabaseService.currentUser.value &&
						!(await this.accountDatabaseService
							.getItem(
								`users/${username}/profileVisible`,
								BooleanProto,
								SecurityModels.unprotected,
								undefined,
								true
							)
							.catch(() => false))
					) {
						this.router.navigate(['profile', '404']);
						return;
					}

					await user.fetch();

					if (!this.destroyed.value) {
						this.accountService.setHeader(user);
					}

					this.accountService.resolveUiReady();
				}
				else {
					this.router.navigate(
						username ? ['profile', '404'] : ['login']
					);
				}
			})
		);
	}

	/** Publishes new user description. */
	public async saveProfile (draft?: {
		avatar?: IFile;
		coverImage?: IFile;
		description?: string;
		forms?: IForm[];
	}) : Promise<void> {
		const user = this.userProfile.value;

		if (!user || !this.isCurrentUser.value) {
			throw new Error("Cannot save another user's profile.");
		}

		this.accountService.interstitial.next(true);

		const {avatar, coverImage, description, forms, name} = !draft ?
			this.draft.value :
			{...this.draft.value, ...draft};

		await Promise.all([
			avatar === undefined ?
				undefined :
				this.accountSettingsService.setAvatar(avatar),
			coverImage === undefined ?
				undefined :
				this.accountSettingsService.setCoverImage(coverImage),
			(async () => {
				if (description === undefined && name === undefined) {
					return;
				}

				let descriptionTrimmed =
					description !== undefined ?
						description
							.trim()
							.slice(
								0,
								this.accountService.maxDescriptionLength
							) :
						undefined;

				let nameTrimmed =
					name !== undefined ?
						name
							.trim()
							.slice(0, this.accountService.maxNameLength) :
						undefined;

				await user.accountUserProfile.updateValue(async o => {
					if (descriptionTrimmed === undefined) {
						descriptionTrimmed = o.description;
					}

					if (nameTrimmed === undefined) {
						nameTrimmed = o.name;
					}

					if (
						o.description === descriptionTrimmed &&
						o.name === nameTrimmed
					) {
						throw new Error();
					}

					return {
						...o,
						description: descriptionTrimmed,
						name: nameTrimmed
					};
				});
			})(),
			forms === undefined ?
				undefined :
				user.accountUserProfileExtra.updateValue(async o => ({
					...o,
					forms
				}))
		]);

		this.accountService.interstitial.next(false);
		this.setEditMode(false);
	}

	/** Crops and sets avatar. */
	public async setAvatar (avatar?: IFile) : Promise<void> {
		if (!avatar || !this.editMode.value) {
			return;
		}

		const title = avatar.name;
		const src = await this.getDataURI(avatar);

		if (!src || !this.editMode.value) {
			return;
		}

		const dataURI = await this.dialogService.cropImage({
			aspectRatio: 1,
			src,
			title
		});

		if (!dataURI || !this.editMode.value) {
			return;
		}

		const cropped = await serialize(DataURIProto, dataURI);

		if (!this.editMode.value) {
			return;
		}

		this.updateDraft({avatar: {...avatar, data: cropped}});
	}

	/** Sets edit mode. */
	public async setEditMode (editMode: boolean) : Promise<void> {
		if (
			!this.isCurrentUser.value ||
			!this.accountDatabaseService.currentUser.value
		) {
			throw new Error("Cannot edit another user's profile.");
		}

		this.draft.next({});
		this.router.navigate(['profile', ...(editMode ? ['edit'] : [])]);
		this.accountService.setHeader(
			this.accountDatabaseService.currentUser.value.user
		);

		const user = this.userProfile.value;

		if (!(editMode && this.envService.isTelehealth && user)) {
			return;
		}

		const profilePromise = user.accountUserProfile.getValue();

		await user.accountUserProfileExtra.updateValue(async extra => {
			if (extra.forms && extra.forms.length > 0) {
				throw new Error();
			}

			const {userType} = await profilePromise;

			const forms =
				userType === AccountUserTypes.Org ?
					telehealthOrgProfile() :
				userType === AccountUserTypes.Standard ?
					patientProfile() :
				userType === AccountUserTypes.TelehealthAdmin ?
					telehealthStaffProfile() :
				userType === AccountUserTypes.TelehealthDoctor ?
					doctorProfile() :
					undefined;

			if (forms === undefined) {
				throw new Error();
			}

			return {...extra, forms};
		});
	}

	/** Shares medical data from EHR system with the patient. */
	public async shareEhrData () : Promise<void> {
		const user = this.userProfile.value;

		if (
			!user ||
			!(await this.dialogService.confirm({
				content: this.stringsService.shareEhrData,
				title: this.stringsService.shareEhrDataTitle
			}))
		) {
			return;
		}

		this.accountService.interstitial.next(true);

		let alertPromise = Promise.resolve();

		try {
			/* TODO: Allow doctor to use PatientInfo for this. */
			const [{apiKey}, accountUserProfile] = await Promise.all([
				this.accountFilesService.getEhrApiKey(),
				user.accountUserProfile.getValue()
			]);

			const firstSpaceIndex = accountUserProfile.name.indexOf(' ');
			const lastSpaceIndex = accountUserProfile.name.lastIndexOf(' ');

			const redoxPatient = await this.ehrService.getPatient(apiKey, {
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				Demographics: {
					/* eslint-disable-next-line @typescript-eslint/naming-convention */
					FirstName:
						firstSpaceIndex > -1 ?
							accountUserProfile.name.slice(0, firstSpaceIndex) :
							accountUserProfile.name,
					/* eslint-disable-next-line @typescript-eslint/naming-convention */
					LastName:
						firstSpaceIndex > -1 ?
							accountUserProfile.name.slice(lastSpaceIndex + 1) :
							'',
					/* eslint-disable-next-line @typescript-eslint/naming-convention */
					MiddleName:
						firstSpaceIndex > -1 ?
							accountUserProfile.name.slice(
								firstSpaceIndex + 1,
								lastSpaceIndex
							) :
							''
				}
			});

			await this.accountFilesService.upload(
				accountUserProfile.name,
				redoxPatient,
				user.username
			).result;

			alertPromise = this.dialogService.alert({
				content: this.stringsService.shareEhrDataSuccess,
				title: this.stringsService.shareEhrDataTitle
			});
		}
		catch {
			alertPromise = this.dialogService.alert({
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

	/** Displays PGP public key dialog. */
	public async viewPGPPublicKey () : Promise<void> {
		await this.dialogService.baseDialog(PGPPublicKeyComponent, o => {
			o.user = this.userProfile.value;
		});
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

		/** @see PGPService */
		public readonly pgpService: PGPService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.username = observableAll([
			this.activatedRoute.params,
			this.doctorListOnly
		]).pipe(
			map(([params, doctorListOnly]: [{username?: string}, boolean]) =>
				/* Temporary workaround for listing doctors */
				doctorListOnly &&
				this.envService.environment.customBuild &&
				this.envService.environment.customBuild.config.organization ?
					this.envService.environment.customBuild.config
						.organization :
					params.username
			)
		);

		this.userInternal = cacheObservable(
			observableAll([
				this.username,
				this.accountDatabaseService.currentUser
			]).pipe(
				switchMap(async ([username, currentUser]) =>
					username ?
						{
							isCurrentUser: false,
							user: await this.accountUserLookupService.getUser(
								username,
								undefined,
								undefined,
								false
							),
							username
						} :
					currentUser ?
						{
							isCurrentUser: true,
							user: currentUser.user
						} :
						{
							isCurrentUser: false
						}
				)
			),
			this.subscriptions
		);

		this.userProfile = toBehaviorSubject(
			this.userInternal.pipe(map(o => o.user)),
			undefined,
			this.subscriptions
		);

		this.userMembers = toBehaviorSubject(
			this.userProfile.pipe(
				switchMap(user =>
					user ?
						this.accountOrganizationsService.getMembers(user) :
						of([])
				)
			),
			[],
			this.subscriptions
		);

		this.userOrganiztion = toBehaviorSubject(
			this.userProfile.pipe(
				switchMap(async user =>
					user ?
						this.accountOrganizationsService.getOrganization(user) :
						undefined
				)
			),
			undefined,
			this.subscriptions
		);

		this.isContact = toBehaviorSubject(
			this.username.pipe(
				switchMap(username =>
					username ?
						this.accountContactsService.watchIfContact(
							username,
							this.subscriptions
						) :
						of(false)
				)
			),
			false,
			this.subscriptions
		);

		this.isCurrentUser = toBehaviorSubject(
			this.userInternal.pipe(map(o => o.isCurrentUser)),
			false,
			this.subscriptions
		);
	}
}
