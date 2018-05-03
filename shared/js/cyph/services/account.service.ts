import {Injectable} from '@angular/core';
import {ActivatedRoute, NavigationStart, Router} from '@angular/router';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {User} from '../account';
import {translate} from '../util/translate';
import {resolvable, sleep} from '../util/wait';
import {ConfigService} from './config.service';
import {EnvService} from './env.service';
import {WindowWatcherService} from './window-watcher.service';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** @ignore */
	private readonly _UI_READY	= resolvable();

	/** @ignore */
	private readonly headerInternal: BehaviorSubject<string|undefined>	=
		new BehaviorSubject<string|undefined>(undefined)
	;

	/** @ignore */
	private readonly menuExpandedInternal: BehaviorSubject<boolean>		=
		new BehaviorSubject(!this.envService.isMobile)
	;

	/** @ignore */
	private readonly transitionInternal: BehaviorSubject<boolean>		=
		new BehaviorSubject(false)
	;

	/** Header title for current section. */
	public readonly header: Observable<string|undefined>;

	/** Indicates whether real-time Docs is enabled. */
	public readonly enableDocs: boolean					=
		this.envService.environment.local || (
			!!this.envService.environment.customBuild &&
			this.envService.environment.customBuild.config.enableDocs === true
		)
	;

	/** Indicates the status of the interstitial. */
	public interstitial: boolean						= false;

	/** Indicates whether the UI is ready. */
	public isUiReady: boolean							= false;

	/** Indicates whether menu can be expanded. */
	public readonly menuExpandable: Observable<boolean>;

	/** Indicates whether menu is expanded. */
	public readonly menuExpanded: Observable<boolean>;

	/** Menu width. */
	public readonly menuMaxWidth: Observable<string>;

	/** Indicates whether simplified menu should be displayed. */
	public readonly menuReduced: Observable<boolean>	= combineLatest(
		this.windowWatcherService.height,
		this.windowWatcherService.width
	).pipe(map(([height, width]) =>
		Math.min(height, width) <= this.configService.responsiveMaxWidths.xs
	));

	/** Indicates whether mobile menu is open. */
	public readonly mobileMenuOpen: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** Resolves ready promise. */
	public readonly resolveUiReady: () => void			= this._UI_READY.resolve;

	/** Root for account routes. */
	public readonly routeRoot: string					=
		accountRoot === '' ? '/' : `/${accountRoot}/`
	;

	/** Indicates when view is in transition. */
	public readonly transition: Observable<boolean>		= this.transitionInternal;

	/** Resolves after UI is ready. */
	public readonly uiReady: Promise<void>				= this._UI_READY.promise;

	/** @ignore */
	private get routePath () : string[] {
		let route	= (
			this.activatedRoute.snapshot.firstChild &&
			this.activatedRoute.snapshot.firstChild.url.length > 0
		) ?
			this.activatedRoute.snapshot.firstChild.url :
			undefined
		;

		if (route && route[0].path === accountRoot) {
			route	= (
				this.activatedRoute.snapshot.firstChild &&
				this.activatedRoute.snapshot.firstChild.firstChild &&
				this.activatedRoute.snapshot.firstChild.firstChild.url.length > 0
			) ?
				this.activatedRoute.snapshot.firstChild.firstChild.url :
				undefined
			;
		}

		return route ? route.map(o => o.path) : [];
	}

	/** @ignore */
	private get menuMinWidth () : number {
		return this.menuExpandedMinWidth * 2.5;
	}

	/** Minimum expanded menu width. */
	public get menuExpandedMinWidth () : number {
		return this.envService.isTelehealth ? 325 : 250;
	}

	/** Sets custom header text. */
	public async setHeader (header: string|User) : Promise<void> {
		if (typeof header === 'string') {
			this.headerInternal.next(header);
		}
		else {
			const {name, realUsername}	= await header.accountUserProfile.getValue();
			this.headerInternal.next(name || `@${realUsername}`);
		}
	}

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		this.menuExpandedInternal.next(typeof menuExpanded === 'boolean' ?
			menuExpanded :
			!this.menuExpandedInternal.value
		);
	}

	/** Toggles mobile account menu. */
	public toggleMobileMenu (menuOpen?: boolean) : void {
		this.mobileMenuOpen.next(typeof menuOpen === 'boolean' ?
			menuOpen :
			!this.mobileMenuOpen.value
		);
	}

	/** Triggers event to ends transition between components. */
	public async transitionEnd () : Promise<void> {
		await sleep(0);
		this.transitionInternal.next(false);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		this.header	= combineLatest(
			this.headerInternal,
			this.windowWatcherService.width,
			this.transitionInternal
		).pipe(map(([header, width]) => {
			const routePath	= this.routePath;
			const route		= routePath[0];

			if (
				[
					'appointments',
					'contacts',
					'docs',
					'files',
					'forms',
					'notes',
					'patients',
					'settings',
					'staff'
				].indexOf(route) < 0 ||
				(
					routePath.length > 1
				)
			) {
				return width <= this.configService.responsiveMaxWidths.sm ?
					(header || '') :
					undefined
				;
			}

			return header || translate(route[0].toUpperCase() + route.slice(1));
		}));

		this.menuExpandable	= combineLatest(
			this.menuReduced,
			this.windowWatcherService.width
		).pipe(map(([menuReduced, width]) =>
			!menuReduced && width >= this.menuMinWidth
		));

		this.menuExpanded	= combineLatest(
			this.menuExpandedInternal,
			this.menuExpandable,
			this.mobileMenuOpen,
			this.windowWatcherService.width
		).pipe(map(([menuExpandedInternal, menuExpandable, mobileMenuOpen, width]) =>
			mobileMenuOpen || (
				menuExpandedInternal &&
				menuExpandable &&
				width > this.configService.responsiveMaxWidths.xs
			)
		));

		this.menuMaxWidth	= combineLatest(
			this.menuExpanded,
			this.windowWatcherService.width
		).pipe(map(([menuExpanded, width]) =>
			width <= this.configService.responsiveMaxWidths.xs ?
				'100%' :
				!menuExpanded ?
					'6em' :
					this.menuMinWidth > width ?
						'100%' :
						`${this.menuExpandedMinWidth}px`
		));


		let lastSection	= '';

		this.router.events.subscribe(e => {
			if (!(e instanceof NavigationStart)) {
				return;
			}

			this.headerInternal.next(undefined);

			const section	= (e.url.match(/^account\/(.*?)(\/|$).*/) || [])[1] || '';

			if (section !== lastSection) {
				lastSection	= section;
				this.transitionInternal.next(true);
			}
		});

		this.uiReady.then(() => {
			this.isUiReady	= true;
		});
	}
}
