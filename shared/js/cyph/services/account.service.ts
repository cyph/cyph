import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {map} from 'rxjs/operators/map';
import {WindowWatcherService} from './window-watcher.service';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** @ignore */
	private menuExpandedInternal: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** Indicates the status of the interstitial. */
	public interstitial: boolean				= false;

	/** Indicates whether the browser extension UI should be used. */
	public isExtension: boolean					= false;

	/** Indicates whether the telehealth UI should be used. */
	public isTelehealth: boolean				= false;

	/** Indicates whether the UI is ready. */
	public isUiReady: boolean					= false;

	/** Indicates whether menu is expanded. */
	public menuExpanded: Observable<boolean>	= combineLatest(
		this.menuExpandedInternal,
		this.windowWatcherService.width
	).pipe(map(([menuExpanded, width]) =>
		menuExpanded && width >= (
			this.isTelehealth ? 1550 : 1200
		)
	));

	/** Resolves ready promise. */
	public resolveUiReady: () => void;

	/** Resolves after UI is ready. */
	public readonly uiReady: Promise<void>	= new Promise(resolve => {
		this.resolveUiReady	= resolve;
	});

	/** Toggles account menu. */
	public toggleMenu (menuExpanded?: boolean) : void {
		this.menuExpandedInternal.next(typeof menuExpanded === 'boolean' ?
			menuExpanded :
			!this.menuExpandedInternal.value
		);
	}

	constructor (
		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		this.uiReady.then(() => {
			this.isUiReady	= true;
		});
	}
}
