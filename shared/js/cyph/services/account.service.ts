import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {map} from 'rxjs/operators/map';
import {ConfigService} from './config.service';
import {WindowWatcherService} from './window-watcher.service';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** @ignore */
	private readonly menuExpandedInternal: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** Indicates the status of the interstitial. */
	public interstitial: boolean						= false;

	/** Indicates whether the browser extension UI should be used. */
	public isExtension: boolean							= false;

	/** Indicates whether the telehealth UI should be used. */
	public isTelehealth: boolean						= false;

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
	public resolveUiReady: () => void;

	/** Root for account routes. */
	public readonly routeRoot: string		= accountRoot === '' ? '/' : `/${accountRoot}/`;

	/** Resolves after UI is ready. */
	public readonly uiReady: Promise<void>	= new Promise(resolve => {
		this.resolveUiReady	= resolve;
	});

	/** @ignore */
	private get menuMinWidth () : number {
		return this.menuExpandedMinWidth * 2.5;
	}

	/** Minimum expanded menu width. */
	public get menuExpandedMinWidth () : number {
		return this.isTelehealth ? 325 : 250;
	}

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		this.menuExpandedInternal.next(typeof menuExpanded === 'boolean' ?
			menuExpanded :
			!this.menuExpandedInternal.value
		);
	}

	constructor (
		/** @ignore */
		private readonly configService: ConfigService,

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


		this.uiReady.then(() => {
			this.isUiReady	= true;
		});
	}
}
