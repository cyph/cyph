import {Env} from 'env';
import {EventManager} from 'eventmanager';
import {Thread} from 'thread';
import {locationData} from 'global/base';


/**
 * Manages URL state.
 */
export class UrlState {
	private static urlStateChangeEvent	= 'urlStateChangeEvent';

	/** Generic/non-site-specific URL states. */
	public static states	= {
		notFound: '404'
	};

	/**
	 * Gets URL fragment or (if none exists) the value at the end of the path.
	 * @param fragmentOnly If true, will only return fragment or empty string.
	 */
	public static get (fragmentOnly?: boolean) : string {
		try {
			const fragment: string	= locationData.hash.split('#')[1] || '';

			if (fragmentOnly || fragment) {
				return fragment;
			}

			return locationData.pathname.split('/').filter(s => s !== '').slice(-1)[0] || '';
		}
		catch (_) {
			return '';
		}
	}

	/**
	 * Gets URL fragment and splits with delimiter '/'.
	 */
	public static getSplit () : string[] {
		return UrlState.get(true).split('/');
	}

	/**
	 * Sets handler to run when URL changes.
	 * @param handler
	 */
	public static onchange (handler: Function) : void {
		EventManager.on(UrlState.urlStateChangeEvent, () => handler(UrlState.get()));
	}

	/**
	 * Changes URL. If on WebSigned page, URL state is set as fragment.
	 * @param path
	 * @param shouldReplace If true, previous URL is erased from history.
	 * @param shouldNotTrigger If true, UrlState.onchange is not triggered.
	 * @param redirectFallback If true, uses redirect-based history polyfill.
	 */
	public static set (
		path: string,
		shouldReplace?: boolean,
		shouldNotTrigger?: boolean,
		redirectFallback: boolean = true
	) : void {
		if (Env.isMainThread) {
			for (const c of ['/', '#']) {
				if (path[0] === c) {
					path	= path.substring(1);
				}
			}

			/* Force fragment-based paths in WebSigned environments */
			if (WebSign && path.length > 0) {
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
					UrlState.trigger();
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
			Thread.callMainThread('Cyph.UrlState.set', [
				path,
				shouldReplace,
				shouldNotTrigger,
				redirectFallback
			]);
		}
	}

	/**
	 * Triggers UrlState.onchange.
	 */
	public static trigger () : void {
		EventManager.trigger(UrlState.urlStateChangeEvent);
	}

	private static _	= (() => {
		self.onpopstate	= () => EventManager.trigger(UrlState.urlStateChangeEvent);
	})();
}
