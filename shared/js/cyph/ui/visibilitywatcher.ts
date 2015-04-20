/// <reference path="elements.ts" />
/// <reference path="../eventmanager.ts" />
/// <reference path="../../global/base.ts" />
/// <reference path="../../../lib/typings/jquery/jquery.d.ts" />


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

			private static staticConstructor	= (() => {
				Elements.window.
					focus(() => VisibilityWatcher.trigger(true)).
					blur(() => VisibilityWatcher.trigger(false))
				;
			})();
		}
	}
}
