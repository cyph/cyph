module Cyph {
	export class UrlState {
		private static urlStateChangeEvent	= 'urlStateChangeEvent';

		public static states	= {
			notFound: '404'
		};

		public static get (fragmentOnly?: boolean) : string {
			try {
				let fragment: string	= location.hash.split('#')[1] || '';

				if (fragmentOnly || fragment) {
					return fragment;
				}


				let split: string[]	= location.pathname.split('/');

				let a: string	= split.slice(-1)[0] || '';
				let b: string	= split.slice(-2)[0] || '';

				if (!a && b) {
					return b;
				}

				return a;
			}
			catch (_) {
				return '';
			}
		}

		public static onchange (handler: Function) : void {
			EventManager.on(UrlState.urlStateChangeEvent, () => handler(UrlState.get()));
		}

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
	}
}
