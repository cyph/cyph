module Cyph {
	export module UI {
		export class NanoScroller {
			public static isActive: boolean	= !Env.isMobile && !Env.isOSX;

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
