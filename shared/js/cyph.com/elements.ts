import * as CyphElements from '../cyph/ui/elements';


/**
 * cyph.com-specific UI this.
 */
export class Elements {
	/** @see Elements */
	public readonly bouncingDownArrow	= CyphElements.Elements.getElement('.bouncing-down-arrow');

	/** @see Elements */
	public backgroundVideo				= CyphElements.Elements.getElement(
		'.hero-background > :first-child'
	);

	/** @see Elements */
	public readonly contactForm			= CyphElements.Elements.getElement(
		'#contact cyph-contact'
	);

	/** @see Elements */
	public readonly contentContainers	= CyphElements.Elements.getElement(
		'.section-content-container'
	);

	/** @see Elements */
	public readonly demoRoot			= CyphElements.Elements.getElement('.demo-root');

	/** @see Elements */
	public readonly demoListDesktop		= CyphElements.Elements.getElement(
		'.demo-root > .desktop .message-list md-list'
	);

	/** @see Elements */
	public readonly demoRootDesktop		= CyphElements.Elements.getElement(
		'.demo-root > .desktop'
	);

	/** @see Elements */
	public readonly demoListMobile		= CyphElements.Elements.getElement(
		'.demo-root > .mobile .message-list md-list'
	);

	/** @see Elements */
	public readonly demoRootMobile		= CyphElements.Elements.getElement('.demo-root > .mobile');

	/** @see Elements */
	public readonly featuresSection		= CyphElements.Elements.getElement('#features-section');

	/** @see Elements */
	public readonly fixedHeaderStuff	= CyphElements.Elements.getElement(
		() => this.newCyph().add('#main-toolbar').add(this.bouncingDownArrow())
	);

	/** @see Elements */
	public readonly heroSection			= CyphElements.Elements.getElement('#hero-section');

	/** @see Elements */
	public readonly heroText			= CyphElements.Elements.getElement(
		'#hero-section .hero-text'
	);

	/** @see Elements */
	public readonly mainToolbar			= CyphElements.Elements.getElement('#main-toolbar');

	/** @see Elements */
	public readonly newCyph				= CyphElements.Elements.getElement('#new-cyph');

	/** @see Elements */
	public readonly newCyphParent		= CyphElements.Elements.getElement(
		() => this.newCyph().parent()
	);

	/** @see Elements */
	public readonly promoLogo			= CyphElements.Elements.getElement('.promo-logo');

	/** @see Elements */
	public readonly screenshotLaptop	= CyphElements.Elements.getElement(
		'#hero-section .laptop.screenshot'
	);

	/** @see Elements */
	public readonly screenshotPhone		= CyphElements.Elements.getElement(
		'#hero-section .phone.screenshot'
	);

	/** @see Elements */
	public readonly testimonialsSection	= CyphElements.Elements.getElement(
		'#testimonials-section'
	);

	constructor () {}
}

/** @see Elements */
export const elements	= new Elements();
