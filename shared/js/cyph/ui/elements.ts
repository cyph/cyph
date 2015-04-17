/// <reference path="../../global/base.ts" />
/// <reference path="../../../lib/typings/jquery/jquery.d.ts" />


module Cyph {
	export module UI {
		export class Elements {
			public static window: JQuery		= $(window);
			public static html: JQuery			= $('html');
			public static everything: JQuery	= $('*');

			protected static loadHelper (elements: Elements) : void {
				Object.keys(elements).
					filter((k: string) => k !== 'load').
					forEach((k: string) =>
						elements[k]	= $(elements[k].selector)
					)
				;
			}

			public static load () : void {
				Elements.loadHelper(Elements);
			}
		}
	}
}
