module Cyph.com {
	export module UI {
		/**
		 * cyph.com-specific UI elements.
		 */
		export class Elements {
			public static bouncingDownArrow: JQuery;
			public static backgroundVideo: JQuery;
			public static demoRoot: JQuery;
			public static demoListDesktop: JQuery;
			public static demoRootDesktop: JQuery;
			public static demoRootMobile: JQuery;
			public static demoListMobile: JQuery;
			public static featureListItems: JQuery;
			public static fixedHeaderStuff: JQuery;
			public static heroSection: JQuery;
			public static heroText: JQuery;
			public static mainToolbar: JQuery;
			public static newCyph: JQuery;
			public static newCyphParent: JQuery;
			public static podcastLogo: JQuery;
			public static screenshotLaptop: JQuery;
			public static screenshotPhone: JQuery;
			public static testimonialLogos: JQuery;
			public static testimonialQuotes: JQuery;

			/**
			 * Loads elements (call this after page is loaded).
			 */
			public static load () : void {
				Cyph.UI.Elements.load();

				Elements.bouncingDownArrow	= $('.bouncing-down-arrow');
				Elements.backgroundVideo	= $('.hero-background > :first-child');
				Elements.demoRoot			= $('.demo-root');
				Elements.demoListDesktop	= $('.demo-root > .desktop .message-list md-list');
				Elements.demoRootDesktop	= $('.demo-root > .desktop');
				Elements.demoListMobile		= $('.demo-root > .mobile .message-list md-list');
				Elements.demoRootMobile		= $('.demo-root > .mobile');
				Elements.featureListItems	= $('.feature-list-item');
				Elements.heroSection		= $('#hero-section');
				Elements.heroText			= $('#hero-section .hero-text');
				Elements.mainToolbar		= $('#main-toolbar');
				Elements.newCyph			= $('#new-cyph');
				Elements.newCyphParent		= Elements.newCyph.parent();
				Elements.podcastLogo		= $('.podcast-logo');
				Elements.screenshotLaptop	= $('#hero-section .laptop.screenshot');
				Elements.screenshotPhone	= $('#hero-section .phone.screenshot');
				Elements.testimonialLogos	= $('#testimonials-section .logo');
				Elements.testimonialQuotes	= $('#testimonials-section .quote');

				Elements.fixedHeaderStuff	= Elements.newCyph.
					add('#main-toolbar').
					add(Elements.bouncingDownArrow)
				;
			}
		}
	}
}
