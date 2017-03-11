import {Injectable} from '@angular/core';
import {eventManager} from '../event-manager';
import {EnvService} from './env.service';


/**
 * Manages URL state.
 */
@Injectable()
export class UrlStateService {
	/** @ignore */
	private static readonly setThreadEvent: string		= 'setThreadEvent';

	/** @ignore */
	private static readonly urlStateChangeEvent: string	= 'urlStateChangeEvent';


	/** Generic/non-site-specific URL states. */
	public readonly states	= {
		notFound: '404'
	};

	/**
	 * Gets URL fragment or (if none exists) path without leading slash.
	 * @param fragmentOnly If true, will only return fragment or empty string.
	 */
	public getUrl (fragmentOnly?: boolean) : string {
		try {
			const fragment: string	= locationData.hash.toLowerCase().split('#')[1] || '';

			if (fragmentOnly || fragment) {
				return fragment;
			}

			return locationData.pathname.toLowerCase().substring(1) || '';
		}
		catch (_) {
			return '';
		}
	}

	/**
	 * Gets URL fragment and splits with delimiter '/'.
	 */
	public getUrlSplit () : string[] {
		return this.getUrl(true).split('/');
	}

	/**
	 * Sets handler to run when URL changes.
	 * @param handler
	 */
	public onChange (handler: (newUrlState: string) => void) : void {
		eventManager.on(UrlStateService.urlStateChangeEvent, () => { handler(this.getUrl()); });
	}

	/**
	 * Changes URL. If on WebSigned page, URL state is set as fragment.
	 * @param path
	 * @param shouldReplace If true, previous URL is erased from history.
	 * @param shouldNotTrigger If true, UrlState.onChange is not triggered.
	 * @param redirectFallback If true, uses redirect-based history polyfill.
	 */
	public setUrl (
		path: string,
		shouldReplace?: boolean,
		shouldNotTrigger?: boolean,
		redirectFallback: boolean = true
	) : void {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.envService.isMainThread) {
			for (const c of ['/', '#']) {
				if (path[0] === c) {
					path	= path.substring(1);
				}
			}

			/* Force fragment-based paths when not on home site */
			if (!this.envService.isHomeSite && path.length > 0) {
				path	= '#' + path;
			}

			/* Force absolute paths */
			path	= '/' + path;

			if (shouldReplace) {
				history.replaceState({}, '', path);
			}
			else {
				history.pushState({}, '', path);
			}

			if (!shouldNotTrigger) {
				this.trigger();
			}
		}
		else {
			eventManager.trigger(UrlStateService.setThreadEvent, {
				path,
				redirectFallback,
				shouldNotTrigger,
				shouldReplace
			});
		}
	}

	/**
	 * Triggers UrlState.onChange.
	 */
	public trigger () : void {
		eventManager.trigger(UrlStateService.urlStateChangeEvent);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		if (this.envService.isMainThread) {
			eventManager.on(UrlStateService.setThreadEvent, (o: {
				path: string;
				redirectFallback?: boolean;
				shouldNotTrigger?: boolean;
				shouldReplace?: boolean;
			}) => { this.setUrl(
				o.path,
				o.shouldReplace,
				o.shouldNotTrigger,
				o.redirectFallback
			); });

			self.onpopstate	= () => { eventManager.trigger(UrlStateService.urlStateChangeEvent); };
		}
	}
}
