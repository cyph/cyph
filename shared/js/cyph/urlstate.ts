module Cyph {
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
				const fragment: string	= location.hash.split('#')[1] || '';

				if (fragmentOnly || fragment) {
					return fragment;
				}

				return location.pathname.split('/').filter(s => s !== '').slice(-1)[0] || '';
			}
			catch (_) {
				return '';
			}
		}

		/**
		 * Sets handler to run when URL changes.
		 * @param handler
		 */
		public static onchange (handler: Function) : void {
			EventManager.on(UrlState.urlStateChangeEvent, () => handler(UrlState.get()));
		}

		/**
		 * Changes URL.
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
				if (path[0] !== '/') {
					path	= '/' + path;
				}

				if (history) {
					if (shouldReplace) {
						history.replaceState({}, '', path);
					}
					else {
						history.pushState({}, '', path);
					}

					if (!shouldNotTrigger) {
						EventManager.trigger(UrlState.urlStateChangeEvent);
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

		private static _	= (() => {
			self.onpopstate	= () => EventManager.trigger(UrlState.urlStateChangeEvent);
		})();
	}
}
