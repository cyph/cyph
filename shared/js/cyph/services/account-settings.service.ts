import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {map, switchMap, take} from 'rxjs/operators';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {IAsyncValue} from '../iasync-value';
import {IFile} from '../ifile';
import {CyphPlanConfig} from '../plan-config';
import {BinaryProto, CyphPlans, InvertedBooleanProto} from '../proto';
import {cacheObservable} from '../util/flatten-observable';
import {ConfigService} from './config.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {EnvService} from './env.service';
import {FileService} from './file.service';
import {StringsService} from './strings.service';

/**
 * Account settings service.
 */
@Injectable()
export class AccountSettingsService extends BaseProvider {
	/** User-set flags to enable/disable features. */
	public readonly featureFlags = {
		docs: this.getFeatureFlag('docs'),
		files: this.getFeatureFlag('files'),
		forms: this.getFeatureFlag('forms'),
		inbox: this.getFeatureFlag('inbox'),
		invite: this.getFeatureFlag('invite'),
		messaging: this.getFeatureFlag('messaging'),
		notes: this.getFeatureFlag('notes'),
		passwords: this.getFeatureFlag('passwords'),
		pgp: this.getFeatureFlag('pgp'),
		scheduler: this.getFeatureFlag('scheduler'),
		social: this.getFeatureFlag('social'),
		vault: this.getFeatureFlag('vault'),
		wallets: this.getFeatureFlag('wallets')
	};

	/** List of feature flags. */
	public readonly featureFlagsList: {
		featureFlag: IAsyncValue<boolean>;
		id: string;
		label: string;
		visible: Observable<boolean>;
	}[];

	/** User's plan / premium status. */
	public readonly plan = cacheObservable(
		this.accountDatabaseService.currentUserFiltered.pipe(
			switchMap(o => o.user.plan)
		),
		this.subscriptions
	);

	/** Indicates whether features are enabled by current environment or plan. */
	public readonly staticFeatureFlags = {
		docs: of(
			this.envService.debug ||
				(!!this.envService.environment.customBuild &&
					this.envService.environment.customBuild.config
						.enableDocs === true)
		),
		group: this.envService.debug ?
			of(true) :
			this.plan.pipe(
				map(plan => this.configService.planConfig[plan].enableGroup)
			),
		passwords: this.envService.debug ?
			of(true) :
			this.plan.pipe(
				map(plan => this.configService.planConfig[plan].enablePasswords)
			),
		scheduler: this.envService.debug ?
			of(true) :
			this.plan.pipe(
				map(plan => this.configService.planConfig[plan].enableScheduler)
			),
		screenSharing: this.envService.debug ?
			of(true) :
			this.plan.pipe(
				map(
					plan =>
						this.configService.planConfig[plan].enableScreenSharing
				)
			),
		wallets:
			this.envService.debug ||
			(!!this.envService.environment.customBuild &&
				this.envService.environment.customBuild.config.enableWallets ===
					true) ?
				of(true) :
				this.plan.pipe(
					map(
						plan =>
							this.configService.planConfig[plan].enableWallets
					)
				)
	};

	/** @ignore */
	private getFeatureFlag (featureFlag: string) : IAsyncValue<boolean> {
		return this.accountDatabaseService.getAsyncValue(
			`featureFlags/${featureFlag}`,
			InvertedBooleanProto,
			SecurityModels.unprotected,
			undefined,
			undefined,
			undefined,
			this.subscriptions
		);
	}

	/** @ignore */
	private async setImage (
		file: IFile,
		prop: 'avatar' | 'coverImage'
	) : Promise<void> {
		await this.accountDatabaseService.setItem(
			prop,
			BinaryProto,
			await this.fileService.getBytes(file, true),
			SecurityModels.public
		);
	}

	/** User's plan / premium status checkout path. */
	public async getPlanCheckoutPath () : Promise<string> {
		return (await this.getPlanConfig()).checkoutPath || '';
	}

	/** User's plan / premium status configuration. */
	public async getPlanConfig () : Promise<CyphPlanConfig> {
		return this.configService.planConfig[
			await this.plan.pipe(take(1)).toPromise()
		];
	}

	/** User's plan / premium status (string representation). */
	public async getPlanString () : Promise<string> {
		return CyphPlans[await this.plan.pipe(take(1)).toPromise()];
	}

	/** Sets the currently signed in user's avatar. */
	public async setAvatar (file: IFile) : Promise<void> {
		return this.setImage(file, 'avatar');
	}

	/** Sets the currently signed in user's cover image. */
	public async setCoverImage (file: IFile) : Promise<void> {
		return this.setImage(file, 'coverImage');
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly fileService: FileService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();

		this.featureFlagsList = [
			{
				featureFlag: this.featureFlags.inbox,
				id: 'inbox',
				label: this.stringsService.featureFlagsInbox,
				visible: of(true)
			},
			{
				featureFlag: this.featureFlags.scheduler,
				id: 'scheduler',
				label: this.stringsService.featureFlagsScheduler,
				visible: this.staticFeatureFlags.scheduler
			},
			{
				featureFlag: this.featureFlags.docs,
				id: 'docs',
				label: this.stringsService.featureFlagsDocs,
				visible: this.staticFeatureFlags.docs
			},
			{
				featureFlag: this.featureFlags.files,
				id: 'files',
				label: this.stringsService.featureFlagsFiles,
				visible: of(true)
			},
			{
				featureFlag: this.featureFlags.forms,
				id: 'forms',
				label: this.stringsService.featureFlagsForms,
				visible: of(true)
			},
			{
				featureFlag: this.featureFlags.invite,
				id: 'invite',
				label: this.stringsService.featureFlagsInvite,
				visible: of(true)
			},
			{
				featureFlag: this.featureFlags.messaging,
				id: 'messaging',
				label: this.stringsService.featureFlagsMessaging,
				visible: of(true)
			},
			{
				featureFlag: this.featureFlags.notes,
				id: 'notes',
				label: this.stringsService.featureFlagsNotes,
				visible: of(true)
			},
			{
				featureFlag: this.featureFlags.passwords,
				id: 'passwords',
				label: this.stringsService.featureFlagsPasswords,
				visible: this.staticFeatureFlags.passwords
			},
			{
				featureFlag: this.featureFlags.pgp,
				id: 'pgp',
				label: this.stringsService.featureFlagsPGP,
				visible: of(true)
			},
			{
				featureFlag: this.featureFlags.social,
				id: 'social',
				label: this.stringsService.featureFlagsSocial,
				visible: of(true)
			},
			{
				featureFlag: this.featureFlags.vault,
				id: 'vault',
				label: this.stringsService.featureFlagsVault,
				visible: of(true)
			},
			{
				featureFlag: this.featureFlags.wallets,
				id: 'wallets',
				label: this.stringsService.featureFlagsWallets,
				visible: this.staticFeatureFlags.wallets
			}
		];
	}
}
