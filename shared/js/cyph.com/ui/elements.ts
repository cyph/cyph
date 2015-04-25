module Cyph.com {
	export module UI {
		export class Elements {
			public static bouncingDownArrow: JQuery	= $('#bouncing-down-arrow');
			public static backgroundVideo: JQuery	= $('#background-video > :first-child');
			public static featureListItems: JQuery	= $('.feature-list-item');
			public static heroText: JQuery			= $('#hero-section .hero-text');
			public static newCyph: JQuery			= $('#new-cyph');
			public static newCyphParent: JQuery		= Elements.newCyph.parent();
			public static podcastLogo: JQuery		= $('.podcast-logo');

			public static fixedHeaderStuff: JQuery	= Elements.newCyph.
				add('#main-toolbar').
				add(Elements.bouncingDownArrow)
			;

			public static load () : void {
				Cyph.UI.Elements.load(Elements);
			}
		}
	}
}
