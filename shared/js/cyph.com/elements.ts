import * as Cyph from '../cyph';


/**
 * cyph.com-specific UI elements.
 */
export class Elements {
	/** @see Elements */
	public static bouncingDownArrow		= Cyph.UI.Elements.get('.bouncing-down-arrow');

	/** @see Elements */
	public static backgroundVideo		= Cyph.UI.Elements.get('.hero-background > :first-child');

	/** @see Elements */
	public static contactForm			= Cyph.UI.Elements.get('#contact cyph-contact');

	/** @see Elements */
	public static contentContainers		= Cyph.UI.Elements.get('.section-content-container');

	/** @see Elements */
	public static demoRoot				= Cyph.UI.Elements.get('.demo-root');

	/** @see Elements */
	public static demoListDesktop		= Cyph.UI.Elements.get(
		'.demo-root > .desktop .message-list md-list'
	);

	/** @see Elements */
	public static demoRootDesktop		= Cyph.UI.Elements.get('.demo-root > .desktop');

	/** @see Elements */
	public static demoListMobile		= Cyph.UI.Elements.get(
		'.demo-root > .mobile .message-list md-list'
	);

	/** @see Elements */
	public static demoRootMobile		= Cyph.UI.Elements.get('.demo-root > .mobile');

	/** @see Elements */
	public static featuresSection		= Cyph.UI.Elements.get('#features-section');

	/** @see Elements */
	public static fixedHeaderStuff		= Cyph.UI.Elements.get(
		() => Elements.newCyph().add('#main-toolbar').add(Elements.bouncingDownArrow())
	);

	/** @see Elements */
	public static heroSection			= Cyph.UI.Elements.get('#hero-section');

	/** @see Elements */
	public static heroText				= Cyph.UI.Elements.get('#hero-section .hero-text');

	/** @see Elements */
	public static mainToolbar			= Cyph.UI.Elements.get('#main-toolbar');

	/** @see Elements */
	public static newCyph				= Cyph.UI.Elements.get('#new-cyph');

	/** @see Elements */
	public static newCyphParent			= Cyph.UI.Elements.get(() => Elements.newCyph().parent());

	/** @see Elements */
	public static promoLogo				= Cyph.UI.Elements.get('.promo-logo');

	/** @see Elements */
	public static screenshotLaptop		= Cyph.UI.Elements.get('#hero-section .laptop.screenshot');

	/** @see Elements */
	public static screenshotPhone		= Cyph.UI.Elements.get('#hero-section .phone.screenshot');

	/** @see Elements */
	public static testimonialsSection	= Cyph.UI.Elements.get('#testimonials-section');
}
