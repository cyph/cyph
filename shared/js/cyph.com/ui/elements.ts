module Cyph.com {
	export module UI {
		/**
		 * cyph.com-specific UI elements.
		 */
		export class Elements {
			public static bouncingDownArrow: JQuery;
			public static backgroundVideo: JQuery;
			public static featureListItems: JQuery;
			public static fixedHeaderStuff: JQuery;
			public static heroText: JQuery;
			public static newCyph: JQuery;
			public static newCyphParent: JQuery;
			public static podcastLogo: JQuery;

			/**
			 * Loads elements (call this after page is loaded).
			 */
			public static load () : void {
				Cyph.UI.Elements.load();

				Elements.bouncingDownArrow	= $('#bouncing-down-arrow');
				Elements.backgroundVideo	= $('#background-video > :first-child');
				Elements.featureListItems	= $('.feature-list-item');
				Elements.heroText			= $('#hero-section .hero-text');
				Elements.newCyph			= $('#new-cyph');
				Elements.newCyphParent		= Elements.newCyph.parent();
				Elements.podcastLogo		= $('.podcast-logo');

				Elements.fixedHeaderStuff	= Elements.newCyph.
					add('#main-toolbar').
					add(Elements.bouncingDownArrow)
				;
			}
		}
	}
}
