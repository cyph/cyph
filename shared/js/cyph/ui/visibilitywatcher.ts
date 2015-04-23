module Cyph {
	export module UI {
		export class VisibilityWatcher {
			private static visibilityChangeEvent: string	= 'visibilityChangeEvent';

			public static isVisible: boolean	= true;

			private static trigger (isVisible: boolean) : void {
				this.isVisible	= isVisible;
				EventManager.trigger(VisibilityWatcher.visibilityChangeEvent, this.isVisible);
			}

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
