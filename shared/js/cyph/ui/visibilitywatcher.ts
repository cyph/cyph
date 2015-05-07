module Cyph {
	export module UI {
		/**
		 * Keeps track of this window's visibility to user.
		 */
		export class VisibilityWatcher {
			private static visibilityChangeEvent: string	= 'visibilityChangeEvent';

			/** Indicates whether the window is currently visible. */
			public static isVisible: boolean	= true;

			private static trigger (isVisible: boolean) : void {
				this.isVisible	= isVisible;
				EventManager.trigger(VisibilityWatcher.visibilityChangeEvent, this.isVisible);
			}

			/**
			 * Sets handler to run when visibility changes.
			 * @param handler
			 */
			public static onchange (handler: Function) : void {
				EventManager.on(VisibilityWatcher.visibilityChangeEvent, handler);
			}

			private static _	= (() => {
				if (Env.isMobile) {
					document.addEventListener('visibilitychange', () =>
						VisibilityWatcher.trigger(!document.hidden)
					);
				}
				else {
					Elements.window.
						focus(() => VisibilityWatcher.trigger(true)).
						blur(() => VisibilityWatcher.trigger(false))
					;
				}
			})();
		}
	}
}
