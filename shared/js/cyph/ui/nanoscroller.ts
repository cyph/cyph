/// <reference path="elements.ts" />
/// <reference path="../env.ts" />
/// <reference path="../util.ts" />
/// <reference path="../../global/base.ts" />


module Cyph {
	export module UI {
		export class NanoScroller {
			public static isActive: boolean	= !Env.isMobile && !Env.isOSX;

			public static update () : void {
				if (NanoScroller.isActive) {
					Util.getValue(Elements.nanoScroller, 'nanoScroller', () => {})();
				}
			}
		}
	}
}


$(Cyph.UI.NanoScroller.update);
