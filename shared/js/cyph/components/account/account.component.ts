import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	OnInit,
	ViewChild
} from '@angular/core';
import {ActivatedRoute, UrlSegment} from '@angular/router';
import {Observable, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {UserPresence} from '../../account';
import {BaseProvider} from '../../base-provider';
import {InAppPurchaseComponent} from '../../components/in-app-purchase';
import {initGranim} from '../../granim';
import {CyphPlans} from '../../proto';
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
import {SalesService} from '../../services/sales.service';
import {ScreenshotService} from '../../services/screenshot.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by';
import {observableAll} from '../../util/observable-all';
import {resolvable} from '../../util/wait/resolvable';

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
		switchMap(() =>
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

	/** Indicates whether section should take up 100% height. */
	public readonly fullHeight: Observable<boolean> = observableAll([
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
	public readonly fullWidth: Observable<boolean> = observableAll([
		this.activatedRouteURL,
		this.envService.isMobile,
		this.route
	]).pipe(
		map(
			([activatedRouteURL, isMobile, route]) =>
				isMobile ||
				(this.envService.isTelehealth &&
					[
						...(this.envService.environment.customBuild?.config
							.organization ?
							['doctors'] :
							[])
					].indexOf(route) > -1) ||
				[
					'',
					'account-burner',
					'audio',
					'call',
					'feed',
					'mail',
					'pgp',
					'post',
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

	/** @see InAppPurchaseComponent */
	@ViewChild('inAppPurchase', {read: InAppPurchaseComponent})
	public inAppPurchase?: InAppPurchaseComponent;

	/** Indicates whether menu should be displayed. */
	public readonly menuVisible: Observable<boolean> = observableAll([
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
					'schedule',
					'audio',
					'call',
					'checklist',
					'compose',
					'confirm-email',
					'contacts',
					'docs',
					'doctors',
					'ehr-access',
					'feed',
					'files',
					'forms',
					'inbox',
					'incoming-patient-info',
					'mail',
					'messages',
					'messaging',
					'new-patient',
					'notes',
					'notifications',
					'passwords',
					'patients',
					'pgp',
					'post',
					'profile',
					'request-appointment',
					'request-followup',
					'settings',
					'staff',
					'transition',
					'vault',
					'video',
					'wallets',
					'warrant-canary',
					'welcome'
				].indexOf(route) > -1
			);
		})
	);

	/** Indicates whether sidebar should be displayed. */
	public readonly sidebarVisible: Observable<boolean> = observableAll([
		this.envService.isMobile,
		this.route,
		this.routePath
	]).pipe(
		map(
			([isMobile, route, routePath]) =>
				!isMobile &&
				([
					'audio',
					'call',
					'feed',
					'inbox',
					'mail',
					'messages',
					'post',
					'transition',
					'video',
					'welcome'
				].indexOf(route) > -1 ||
					(['profile'].indexOf(route) > -1 && routePath.length > 1))
		)
	);

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @see UserPresence */
	public readonly userPresence = UserPresence;

	/** Resolves after view init. */
	public readonly viewInitiated: Promise<void> = this._VIEW_INITIATED;

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		this.resolveViewInitiated();
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

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

		/** @see SalesService */
		public readonly salesService: SalesService,

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
	}
}
