module Cyph {
	export module UI {
		export class VisibilityWatcher {
			private static visibilityChangeEvent: string	= 'visibilityChangeEvent';

			public static isVisible: boolean	= true;

			public static onchange (handler: Function) : void {
				EventManager.on(VisibilityWatcher.visibilityChangeEvent, handler);
			}

			public static trigger (isVisible: boolean) : void {
				this.isVisible	= isVisible;
				EventManager.trigger(VisibilityWatcher.visibilityChangeEvent, this.isVisible);
			}

			private static _	= requireModules(
				() => Elements,
				() => {
					Elements.window.
						focus(() => VisibilityWatcher.trigger(true)).
						blur(() => VisibilityWatcher.trigger(false))
					;
				}
			);
		}
	}
}
