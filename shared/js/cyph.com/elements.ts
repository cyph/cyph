import * as Cyph from '../cyph';


/**
 * cyph.com-specific UI elements.
 */
export class Elements {
	public static bouncingDownArrow		= Cyph.UI.Elements.get('.bouncing-down-arrow');
	public static backgroundVideo		= Cyph.UI.Elements.get('.hero-background > :first-child');
	public static contactForm			= Cyph.UI.Elements.get('#contact cyph-contact');
	public static contentContainers		= Cyph.UI.Elements.get('.section-content-container');
	public static demoRoot				= Cyph.UI.Elements.get('.demo-root');
	public static demoListDesktop		= Cyph.UI.Elements.get('.demo-root > .desktop .message-list md-list');
	public static demoRootDesktop		= Cyph.UI.Elements.get('.demo-root > .desktop');
	public static demoListMobile		= Cyph.UI.Elements.get('.demo-root > .mobile .message-list md-list');
	public static demoRootMobile		= Cyph.UI.Elements.get('.demo-root > .mobile');
	public static featuresSection		= Cyph.UI.Elements.get('#features-section');
	public static heroSection			= Cyph.UI.Elements.get('#hero-section');
	public static heroText				= Cyph.UI.Elements.get('#hero-section .hero-text');
	public static mainToolbar			= Cyph.UI.Elements.get('#main-toolbar');
	public static newCyph				= Cyph.UI.Elements.get('#new-cyph');
	public static promoLogo				= Cyph.UI.Elements.get('.promo-logo');
	public static screenshotLaptop		= Cyph.UI.Elements.get('#hero-section .laptop.screenshot');
	public static screenshotPhone		= Cyph.UI.Elements.get('#hero-section .phone.screenshot');
	public static testimonialsSection	= Cyph.UI.Elements.get('#testimonials-section');

	public static newCyphParent		= () => Elements.newCyph().parent();

	public static fixedHeaderStuff	= () => Elements.newCyph().add(
		'#main-toolbar'
	).add(
		Elements.bouncingDownArrow()
	);
}
