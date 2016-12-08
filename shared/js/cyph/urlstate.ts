import {env} from './env';
import {eventManager} from './eventmanager';


/**
 * Manages URL state.
 */
export class UrlState {
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
	public get (fragmentOnly?: boolean) : string {
		try {
			const fragment: string	= locationData.hash.split('#')[1] || '';

			if (fragmentOnly || fragment) {
				return fragment;
			}

			return locationData.pathname.substring(1) || '';
		}
		catch (_) {
			return '';
		}
	}

	/**
	 * Gets URL fragment and splits with delimiter '/'.
	 */
	public getSplit () : string[] {
		return this.get(true).split('/');
	}

	/**
	 * Sets handler to run when URL changes.
	 * @param handler
	 */
	public onchange (handler: (newUrlState: string) => void) : void {
		eventManager.on(UrlState.urlStateChangeEvent, () => handler(this.get()));
	}

	/**
	 * Changes URL. If on WebSigned page, URL state is set as fragment.
	 * @param path
	 * @param shouldReplace If true, previous URL is erased from history.
	 * @param shouldNotTrigger If true, UrlState.onchange is not triggered.
	 * @param redirectFallback If true, uses redirect-based history polyfill.
	 */
	public set (
		path: string,
		shouldReplace?: boolean,
		shouldNotTrigger?: boolean,
		redirectFallback: boolean = true
	) : void {
		if (env.isMainThread) {
			for (let c of ['/', '#']) {
				if (path[0] === c) {
					path	= path.substring(1);
				}
			}

			/* Force fragment-based paths when not on home site */
			if (!env.isHomeSite && path.length > 0) {
				path	= '#' + path;
			}

			/* Force absolute paths */
			path	= '/' + path;

			if (history && history.pushState) {
				if (shouldReplace && history.replaceState) {
					history.replaceState({}, '', path);
				}
				else {
					history.pushState({}, '', path);
				}

				if (!shouldNotTrigger) {
					this.trigger();
				}
			}
			else if (redirectFallback) {
				if (shouldReplace) {
					location.replace(path);
				}
				else {
					location.pathname	= path;
				}
			}
		}
		else {
			eventManager.trigger(UrlState.setThreadEvent, {
				path,
				redirectFallback,
				shouldNotTrigger,
				shouldReplace
			});
		}
	}

	/**
	 * Triggers UrlState.onchange.
	 */
	public trigger () : void {
		eventManager.trigger(UrlState.urlStateChangeEvent);
	}

	constructor () {
		if (env.isMainThread) {
			eventManager.on(UrlState.setThreadEvent, (o: {
				path: string;
				redirectFallback?: boolean;
				shouldNotTrigger?: boolean;
				shouldReplace?: boolean;
			}) => this.set(
				o.path,
				o.shouldReplace,
				o.shouldNotTrigger,
				o.redirectFallback
			));
		}
		else {
			self.onpopstate	= () => eventManager.trigger(UrlState.urlStateChangeEvent);
		}
	}
}

/** @see UrlState */
export const urlState	= new UrlState();
