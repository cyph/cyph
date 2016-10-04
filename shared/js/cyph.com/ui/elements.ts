import * as Cyph from '../../cyph';


/**
 * cyph.com-specific UI elements.
 */
export class Elements {
	public static bouncingDownArrow: JQuery;
	public static backgroundVideo: JQuery;
	public static contactForm: JQuery;
	public static contentContainers: JQuery;
	public static demoRoot: JQuery;
	public static demoListDesktop: JQuery;
	public static demoRootDesktop: JQuery;
	public static demoRootMobile: JQuery;
	public static demoListMobile: JQuery;
	public static featuresSection: JQuery;
	public static fixedHeaderStuff: JQuery;
	public static heroSection: JQuery;
	public static heroText: JQuery;
	public static mainToolbar: JQuery;
	public static newCyph: JQuery;
	public static newCyphParent: JQuery;
	public static promoLogo: JQuery;
	public static screenshotLaptop: JQuery;
	public static screenshotPhone: JQuery;
	public static testimonialsSection: JQuery;

	/**
	 * Loads elements (call this after page is loaded).
	 */
	public static load () : void {
		Cyph.UI.Elements.load();

		Elements.bouncingDownArrow		= $('.bouncing-down-arrow');
		Elements.backgroundVideo		= $('.hero-background > :first-child');
		Elements.contactForm			= $('#contact cyph-contact');
		Elements.contentContainers		= $('.section-content-container');
		Elements.demoRoot				= $('.demo-root');
		Elements.demoListDesktop		= $('.demo-root > .desktop .message-list md-list');
		Elements.demoRootDesktop		= $('.demo-root > .desktop');
		Elements.demoListMobile			= $('.demo-root > .mobile .message-list md-list');
		Elements.demoRootMobile			= $('.demo-root > .mobile');
		Elements.featuresSection		= $('#features-section');
		Elements.heroSection			= $('#hero-section');
		Elements.heroText				= $('#hero-section .hero-text');
		Elements.mainToolbar			= $('#main-toolbar');
		Elements.newCyph				= $('#new-cyph');
		Elements.newCyphParent			= Elements.newCyph.parent();
		Elements.promoLogo			= $('.promo-logo');
		Elements.screenshotLaptop		= $('#hero-section .laptop.screenshot');
		Elements.screenshotPhone		= $('#hero-section .phone.screenshot');
		Elements.testimonialsSection	= $('#testimonials-section');

		Elements.fixedHeaderStuff	= Elements.newCyph.
			add('#main-toolbar').
			add(Elements.bouncingDownArrow)
		;
	}
}
