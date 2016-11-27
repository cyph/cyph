import * as Cyph from '../cyph';


/**
 * cyph.com-specific UI elements.
 */
export class Elements {
	/** @see Elements */
	public static readonly bouncingDownArrow	= Cyph.UI.Elements.get('.bouncing-down-arrow');

	/** @see Elements */
	public static backgroundVideo				= Cyph.UI.Elements.get(
		'.hero-background > :first-child'
	);

	/** @see Elements */
	public static readonly contactForm			= Cyph.UI.Elements.get('#contact cyph-contact');

	/** @see Elements */
	public static readonly contentContainers	= Cyph.UI.Elements.get(
		'.section-content-container'
	);

	/** @see Elements */
	public static readonly demoRoot				= Cyph.UI.Elements.get('.demo-root');

	/** @see Elements */
	public static readonly demoListDesktop		= Cyph.UI.Elements.get(
		'.demo-root > .desktop .message-list md-list'
	);

	/** @see Elements */
	public static readonly demoRootDesktop		= Cyph.UI.Elements.get('.demo-root > .desktop');

	/** @see Elements */
	public static readonly demoListMobile		= Cyph.UI.Elements.get(
		'.demo-root > .mobile .message-list md-list'
	);

	/** @see Elements */
	public static readonly demoRootMobile		= Cyph.UI.Elements.get('.demo-root > .mobile');

	/** @see Elements */
	public static readonly featuresSection		= Cyph.UI.Elements.get('#features-section');

	/** @see Elements */
	public static readonly fixedHeaderStuff		= Cyph.UI.Elements.get(
		() => Elements.newCyph().add('#main-toolbar').add(Elements.bouncingDownArrow())
	);

	/** @see Elements */
	public static readonly heroSection			= Cyph.UI.Elements.get('#hero-section');

	/** @see Elements */
	public static readonly heroText				= Cyph.UI.Elements.get('#hero-section .hero-text');

	/** @see Elements */
	public static readonly mainToolbar			= Cyph.UI.Elements.get('#main-toolbar');

	/** @see Elements */
	public static readonly newCyph				= Cyph.UI.Elements.get('#new-cyph');

	/** @see Elements */
	public static readonly newCyphParent		= Cyph.UI.Elements.get(
		() => Elements.newCyph().parent()
	);

	/** @see Elements */
	public static readonly promoLogo			= Cyph.UI.Elements.get('.promo-logo');

	/** @see Elements */
	public static readonly screenshotLaptop		= Cyph.UI.Elements.get(
		'#hero-section .laptop.screenshot'
	);

	/** @see Elements */
	public static readonly screenshotPhone		= Cyph.UI.Elements.get(
		'#hero-section .phone.screenshot'
	);

	/** @see Elements */
	public static readonly testimonialsSection	= Cyph.UI.Elements.get('#testimonials-section');
}
