import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {map} from 'rxjs/operators/map';
import {EnvService} from './env.service';
import {WindowWatcherService} from './window-watcher.service';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** @ignore */
	private menuExpandedInternal: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** Indicates the status of the interstitial. */
	public interstitial: boolean						= false;

	/** Indicates whether the browser extension UI should be used. */
	public isExtension: boolean							= false;

	/** Indicates whether the telehealth UI should be used. */
	public isTelehealth: boolean						= false;

	/** Indicates whether the UI is ready. */
	public isUiReady: boolean							= false;

	/** Indicates whether menu can be expanded. */
	public readonly menuExpandable: Observable<boolean>	=
		this.windowWatcherService.width.pipe(map(width =>
			this.envService.isMobile || width >= this.menuMinWidth
		))
	;

	/** Indicates whether menu is expanded. */
	public readonly menuExpanded: Observable<boolean>	= combineLatest(
		this.menuExpandedInternal,
		this.menuExpandable
	).pipe(map(([menuExpandedInternal, menuExpandable]) =>
		menuExpandedInternal && menuExpandable
	));

	/** Menu width. */
	public readonly menuMaxWidth: Observable<string>	= combineLatest(
		this.menuExpanded,
		this.windowWatcherService.width
	).pipe(map(([menuExpanded, width]) =>
		!menuExpanded ?
			'6em' :
			this.menuMinWidth > width ?
				'100%' :
				`${this.menuExpandedMinWidth}px`
	));

	/** Resolves ready promise. */
	public resolveUiReady: () => void;

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
		private readonly envService: EnvService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		this.uiReady.then(() => {
			this.isUiReady	= true;
		});
	}
}
