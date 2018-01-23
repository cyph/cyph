import {Injectable} from '@angular/core';
import {NavigationStart, Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {map} from 'rxjs/operators/map';
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
	private readonly menuExpandedInternal: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** @ignore */
	private readonly transitionInternal: BehaviorSubject<boolean>	= new BehaviorSubject(false);

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

	/** Resolves ready promise. */
	public readonly resolveUiReady: () => void			= this._UI_READY.resolve;

	/** Root for account routes. */
	public readonly routeRoot: string		= accountRoot === '' ? '/' : `/${accountRoot}/`;

	/** Indicates when view is in transition. */
	public readonly transition: Observable<boolean>		= this.transitionInternal;

	/** Resolves after UI is ready. */
	public readonly uiReady: Promise<void>				= this._UI_READY.promise;

	/** @ignore */
	private get menuMinWidth () : number {
		return this.menuExpandedMinWidth * 2.5;
	}

	/** Minimum expanded menu width. */
	public get menuExpandedMinWidth () : number {
		return this.envService.isTelehealth ? 325 : 250;
	}

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		this.menuExpandedInternal.next(typeof menuExpanded === 'boolean' ?
			menuExpanded :
			!this.menuExpandedInternal.value
		);
	}

	/** Triggers event to ends transition between components. */
	public async transitionEnd () : Promise<void> {
		await sleep(0);
		this.transitionInternal.next(false);
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		this.menuExpandable	= combineLatest(
			this.menuReduced,
			this.windowWatcherService.width
		).pipe(map(([menuReduced, width]) =>
			!menuReduced && width >= this.menuMinWidth
		));

		this.menuExpanded	= combineLatest(
			this.menuExpandedInternal,
			this.menuExpandable,
			this.windowWatcherService.width
		).pipe(map(([menuExpandedInternal, menuExpandable, width]) =>
			menuExpandedInternal &&
			menuExpandable &&
			width > this.configService.responsiveMaxWidths.xs
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
