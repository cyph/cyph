module Cyph {
	export module UI {
		/**
		 * Handles OS-X-style scrollbars (generally intended for use
		 * only when the scrollbar explicitly needs to be auto-hidden).
		 */
		export class NanoScroller {
			/** Indicates whether NanoScroller is to be used. */
			public static isActive: boolean	= !Env.isMobile && !Env.isOSX;

			/**
			 * Updates the state of all NanoScroller scrollbars.
			 */
			public static update () : void {
				if (NanoScroller.isActive) {
					Util.getValue(
						Elements.nanoScroller,
						'nanoScroller',
						() => {}
					).call(Elements.nanoScroller);
				}
			}

			private static _	= (() => {
				$(NanoScroller.update);
			})();
		}
	}
}
