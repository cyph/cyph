import {AfterViewInit, ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute, UrlSegment} from '@angular/router';
import {combineLatest, Observable, of} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {UserPresence} from '../../account';
import {BaseProvider} from '../../base-provider';
import {initGranim} from '../../granim';
import {AccountEnvService} from '../../services/account-env.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {resolvable} from '../../util/wait';


/**
 * Angular component for the Cyph account screen.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: EnvService,
			useClass: AccountEnvService
		}
	],
	selector: 'cyph-account',
	styleUrls: ['./account.component.scss'],
	templateUrl: './account.component.html'
})
export class AccountComponent extends BaseProvider implements AfterViewInit, OnInit {
	/** @ignore */
	private readonly _VIEW_INITIATED									= resolvable();

	/** @ignore */
	private readonly activatedRouteURL: Observable<UrlSegment[]>		=
		this.accountService.routeChanges.pipe(mergeMap(() =>
			this.activatedRoute.firstChild ?
				this.activatedRoute.firstChild.url :
				of([])
		))
	;

	/** @ignore */
	private readonly route: Observable<string>							=
		this.activatedRouteURL.pipe(map(activatedRouteURL =>
			activatedRouteURL.length > 0 ?
				activatedRouteURL[0].path :
				''
		))
	;

	/** @ignore */
	private readonly routePath: Observable<string[]>					=
		this.accountService.routeChanges.pipe(map(() =>
			this.accountService.routePath
		))
	;

	/** @ignore */
	private readonly resolveViewInitiated: () => void	= this._VIEW_INITIATED.resolve;

	/** Indicates whether section should take up 100% height. */
	public readonly fullHeight: Observable<boolean>			= combineLatest(
		this.activatedRouteURL,
		this.route
	).pipe(map(([activatedRouteURL, route]) =>
		(
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
				'video',
				'welcome'
			].indexOf(route) > -1
		) || (
			activatedRouteURL.length > 1 &&
			[
				'appointments'
			].indexOf(route) > -1
		)
	));

	/** Indicates whether section should take up 100% width. */
	public readonly fullWidth: Observable<boolean>			= combineLatest(
		this.activatedRouteURL,
		this.envService.isMobile,
		this.route
	).pipe(map(([activatedRouteURL, isMobile, route]) =>
		isMobile || (
			this.envService.isTelehealth &&
			[
				'',
				'profile',
				...(
					(
						this.envService.isTelehealth &&
						this.envService.environment.customBuild &&
						this.envService.environment.customBuild.config.organization
					) ?
						['doctors'] :
						[]
				)
			].indexOf(route) > -1
		) || (
			[
				'account-burner',
				'audio',
				'call',
				'mail',
				'messages',
				'profile',
				'video',
				'wallets'
			].indexOf(route) > -1
		) || (
			activatedRouteURL.length > 1 &&
			[
				'appointments',
				'notes'
			].indexOf(route) > -1 &&
			!(
				activatedRouteURL.length > 2 &&
				activatedRouteURL[2].path === 'forms'
			)
		)
	));

	/** Indicates whether menu should be displayed. */
	public readonly menuVisible: Observable<boolean>		= combineLatest(
		this.accountDatabaseService.currentUser,
		this.route,
		this.routePath
	).pipe(map(([currentUser, route]) => {
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

		return currentUser !== undefined && [
			'',
			'404',
			'account-burner',
			'appointments',
			'audio',
			'call',
			'chat-transition',
			'compose',
			'contacts',
			'docs',
			'doctors',
			'ehr-access',
			'files',
			'forms',
			'incoming-patient-info',
			'mail',
			'messages',
			'new-patient',
			'notes',
			'notifications',
			'patients',
			'profile',
			'request-appointment',
			'request-followup',
			'settings',
			'staff',
			'video',
			'wallets',
			'welcome'
		].indexOf(route) > -1;
	}));

	/** Indicates whether sidebar should be displayed. */
	public readonly sidebarVisible: Observable<boolean>		= combineLatest(
		this.envService.isMobile,
		this.route
	).pipe(map(([isMobile, route]) =>
		!isMobile &&
		[
			'',
			'account-burner',
			'audio',
			'call',
			'chat-transition',
			'mail',
			'messages',
			'notifications',
			'profile',
			'video',
			'welcome'
		].indexOf(route) > -1
	));

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence		= UserPresence;

	/** Resolves after view init. */
	public readonly viewInitiated: Promise<void>			= this._VIEW_INITIATED.promise;

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
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
					gradients: !this.envService.isTelehealth ?
						[
							['#f5f5f6', '#cccccc'],
							['#cccccc', '#f5f5f6']
						] :
						[
							['#eeecf1', '#b7bccb'],
							['#b7bccb', '#eeecf1']
						]
					,
					loop: false,
					transitionSpeed: 5000
				}
			}
		});
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof document === 'object' && typeof document.body === 'object') {
			document.body.classList.toggle('primary-account-theme', accountPrimaryTheme);
		}
	}
}
