import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	OnInit
} from '@angular/core';
import {ActivatedRoute, UrlSegment} from '@angular/router';
import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
import {map, mergeMap, skip, take} from 'rxjs/operators';
import {UserPresence} from '../../account';
import {BaseProvider} from '../../base-provider';
import {initGranim} from '../../granim';
import {BooleanProto, CyphPlans} from '../../proto';
import {AccountDebugService} from '../../services/account-debug.service';
import {AccountEnvService} from '../../services/account-env.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {ConfigService} from '../../services/config.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {FaviconService} from '../../services/favicon.service';
import {LocalStorageService} from '../../services/local-storage.service';
import {ScreenshotService} from '../../services/screenshot.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by';
import {resolvable} from '../../util/wait';

/**
 * Angular component for the Cyph account screen.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		AccountDebugService,
		{
			provide: EnvService,
			useClass: AccountEnvService
		}
	],
	selector: 'cyph-account',
	styleUrls: ['./account.component.scss'],
	templateUrl: './account.component.html'
})
export class AccountComponent extends BaseProvider
	implements AfterViewInit, OnInit {
	/** @ignore */
	private readonly _VIEW_INITIATED = resolvable();

	/** @ignore */
	private readonly activatedRouteURL: Observable<
		UrlSegment[]
	> = this.accountService.routeChanges.pipe(
		mergeMap(() =>
			this.activatedRoute.firstChild ?
				this.activatedRoute.firstChild.url :
				of([])
		)
	);

	/** @ignore */
	private readonly route: Observable<string> = this.activatedRouteURL.pipe(
		map(activatedRouteURL =>
			activatedRouteURL.length > 0 ? activatedRouteURL[0].path : ''
		)
	);

	/** @ignore */
	private readonly routePath: Observable<
		string[]
	> = this.accountService.routeChanges.pipe(
		map(() => this.accountService.routePath)
	);

	/** @ignore */
	private readonly resolveViewInitiated: () => void = this._VIEW_INITIATED
		.resolve;

	/** @see CyphPlans */
	public readonly cyphPlans = CyphPlans;

	/** Controls whether flash sale banner is enabled. */
	public readonly flashSaleBanner = new BehaviorSubject<boolean>(false);

	/** Indicates whether section should take up 100% height. */
	public readonly fullHeight: Observable<boolean> = combineLatest([
		this.activatedRouteURL,
		this.route
	]).pipe(
		map(
			([activatedRouteURL, route]) =>
				[
					'',
					'account-burner',
					'audio',
					'call',
					'contacts',
					'doctors',
					'logout',
					'mail',
					'messages',
					'patients',
					'profile',
					'reject',
					'staff',
					'video'
				].indexOf(route) > -1 ||
				(activatedRouteURL.length > 1 &&
					['appointments'].indexOf(route) > -1)
		)
	);

	/** Indicates whether section should take up 100% width. */
	public readonly fullWidth: Observable<boolean> = combineLatest([
		this.activatedRouteURL,
		this.envService.isMobile,
		this.route
	]).pipe(
		map(
			([activatedRouteURL, isMobile, route]) =>
				isMobile ||
				(this.envService.isTelehealth &&
					[
						'',
						'profile',
						...(this.envService.isTelehealth &&
						this.envService.environment.customBuild &&
						this.envService.environment.customBuild.config
							.organization ?
							['doctors'] :
							[])
					].indexOf(route) > -1) ||
				[
					'account-burner',
					'audio',
					'call',
					'mail',
					'profile',
					'video',
					'wallets'
				].indexOf(route) > -1 ||
				(activatedRouteURL.length > 1 &&
					['appointments', 'inbox', 'messages', 'notes'].indexOf(
						route
					) > -1 &&
					!(
						activatedRouteURL.length > 2 &&
						activatedRouteURL[2].path === 'forms'
					))
		)
	);

	/** Indicates whether menu should be displayed. */
	public readonly menuVisible: Observable<boolean> = combineLatest([
		this.accountDatabaseService.currentUser,
		this.route,
		this.routePath
	]).pipe(
		map(([currentUser, route]) => {
			/*
		if (
			[
				'appointments',
				'audio',
				'call',
				'video'
			].indexOf(route) > -1 &&
			routePath.length > 1 &&
			routePath[1] !== 'end'
		) {
			return false;
		}
		*/

			return (
				currentUser !== undefined &&
				!currentUser.pseudoAccount &&
				[
					'',
					'404',
					'appointments',
					'audio',
					'call',
					'compose',
					'contacts',
					'docs',
					'doctors',
					'ehr-access',
					'files',
					'forms',
					'inbox',
					'incoming-patient-info',
					'mail',
					'messages',
					'new-patient',
					'notes',
					'notifications',
					'passwords',
					'patients',
					'profile',
					'request-appointment',
					'request-followup',
					'settings',
					'staff',
					'transition',
					'video',
					'wallets',
					'welcome'
				].indexOf(route) > -1
			);
		})
	);

	/** Indicates whether sidebar should be displayed. */
	public readonly sidebarVisible: Observable<boolean> = combineLatest([
		this.envService.isMobile,
		this.route
	]).pipe(
		map(
			([isMobile, route]) =>
				!isMobile &&
				[
					'',
					'audio',
					'call',
					'mail',
					'messages',
					'notifications',
					'profile',
					'transition',
					'video',
					'welcome'
				].indexOf(route) > -1
		)
	);

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @see UserPresence */
	public readonly userPresence = UserPresence;

	/** Resolves after view init. */
	public readonly viewInitiated: Promise<void> = this._VIEW_INITIATED.promise;

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		this.resolveViewInitiated();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (!this.envService.showGranim) {
			return;
		}

		await initGranim({
			direction: 'radial',
			element: '.cyph-gradient',
			isPausedWhenNotInView: true,
			name: 'basic-gradient',
			opacity: [1, 0.5, 0],
			states: {
				'default-state': {
					gradients: !this.envService.telehealthTheme.value ?
						[
							['#f5f5f6', '#cccccc'],
							['#cccccc', '#f5f5f6']
						] :
						[
							['#eeecf1', '#b7bccb'],
							['#b7bccb', '#eeecf1']
						],
					loop: false,
					transitionSpeed: 5000
				}
			}
		});
	}

	constructor (
		accountDebugService: AccountDebugService,

		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly faviconService: FaviconService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see ScreenshotService */
		public readonly screenshotService: ScreenshotService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		if (this.envService.debug) {
			(<any> self).accountDebugService = accountDebugService;
		}

		if (
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			!(typeof document === 'object' && typeof document.body === 'object')
		) {
			return;
		}

		document.body.classList.toggle(
			'primary-account-theme',
			accountPrimaryTheme
		);

		this.subscriptions.push(
			this.envService.telehealthTheme.subscribe(telehealthTheme => {
				this.faviconService.setFavicon(
					telehealthTheme ? 'telehealth' : 'default'
				);

				document.body.classList.toggle('telehealth', telehealthTheme);

				document.body.classList.toggle(
					'primary-account-theme',
					accountPrimaryTheme && !telehealthTheme
				);
			})
		);

		Promise.all([
			this.localStorageService
				.getItem('2020-01-flashSaleBanner', BooleanProto)
				.catch(() => true),
			this.accountSettingsService.plan
				.pipe(skip(1), take(1))
				.toPromise()
				.catch(() => CyphPlans.Free)
		]).then(([flashSaleBanner, plan]) => {
			this.flashSaleBanner.next(
				flashSaleBanner && !this.configService.planConfig[plan].lifetime
			);
		});

		this.subscriptions.push(
			this.flashSaleBanner
				.pipe(skip(1))
				.subscribe(async flashSaleBanner =>
					this.localStorageService.setItem(
						'2020-01-flashSaleBanner',
						BooleanProto,
						flashSaleBanner
					)
				)
		);
	}
}
