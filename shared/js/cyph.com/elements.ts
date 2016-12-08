import * as CyphElements from '../cyph/ui/elements';


/**
 * cyph.com-specific UI this.
 */
export class Elements {
	/** @see Elements */
	public readonly bouncingDownArrow	= CyphElements.Elements.get('.bouncing-down-arrow');

	/** @see Elements */
	public backgroundVideo				= CyphElements.Elements.get(
		'.hero-background > :first-child'
	);

	/** @see Elements */
	public readonly contactForm			= CyphElements.Elements.get('#contact cyph-contact');

	/** @see Elements */
	public readonly contentContainers	= CyphElements.Elements.get(
		'.section-content-container'
	);

	/** @see Elements */
	public readonly demoRoot			= CyphElements.Elements.get('.demo-root');

	/** @see Elements */
	public readonly demoListDesktop		= CyphElements.Elements.get(
		'.demo-root > .desktop .message-list md-list'
	);

	/** @see Elements */
	public readonly demoRootDesktop		= CyphElements.Elements.get('.demo-root > .desktop');

	/** @see Elements */
	public readonly demoListMobile		= CyphElements.Elements.get(
		'.demo-root > .mobile .message-list md-list'
	);

	/** @see Elements */
	public readonly demoRootMobile		= CyphElements.Elements.get('.demo-root > .mobile');

	/** @see Elements */
	public readonly featuresSection		= CyphElements.Elements.get('#features-section');

	/** @see Elements */
	public readonly fixedHeaderStuff	= CyphElements.Elements.get(
		() => this.newCyph().add('#main-toolbar').add(this.bouncingDownArrow())
	);

	/** @see Elements */
	public readonly heroSection			= CyphElements.Elements.get('#hero-section');

	/** @see Elements */
	public readonly heroText			= CyphElements.Elements.get('#hero-section .hero-text');

	/** @see Elements */
	public readonly mainToolbar			= CyphElements.Elements.get('#main-toolbar');

	/** @see Elements */
	public readonly newCyph				= CyphElements.Elements.get('#new-cyph');

	/** @see Elements */
	public readonly newCyphParent		= CyphElements.Elements.get(
		() => this.newCyph().parent()
	);

	/** @see Elements */
	public readonly promoLogo			= CyphElements.Elements.get('.promo-logo');

	/** @see Elements */
	public readonly screenshotLaptop	= CyphElements.Elements.get(
		'#hero-section .laptop.screenshot'
	);

	/** @see Elements */
	public readonly screenshotPhone		= CyphElements.Elements.get(
		'#hero-section .phone.screenshot'
	);

	/** @see Elements */
	public readonly testimonialsSection	= CyphElements.Elements.get('#testimonials-section');

	constructor () {}
}

/** @see Elements */
export const elements	= new Elements();
