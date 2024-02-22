import $ from 'jquery';

/**
 * DOM elements.
 */
export class Elements {
	/** jQuery wrapper that memoizes DOM elements for performance. */
	private static getElement (
		selector: string | (() => JQuery)
	) : () => JQuery {
		let cache: JQuery;

		const f = typeof selector === 'function' ? selector : () => $(selector);

		return () => {
			if (!cache || cache.length < 1) {
				cache = f();
			}

			return cache;
		};
	}

	/** @see Elements */
	public readonly demoListDesktop = Elements.getElement(
		'.demo-root > .desktop cyph-chat-message-list .message-list-background'
	);

	/** @see Elements */
	public readonly demoListMobile = Elements.getElement(
		'.demo-root > .mobile cyph-chat-message-list .message-list-background'
	);

	/** @see Elements */
	public readonly demoRoot = Elements.getElement('.demo-root');

	/** @see Elements */
	public readonly demoRootDesktop = Elements.getElement(
		'.demo-root > .desktop'
	);

	/** @see Elements */
	public readonly demoRootMobile = Elements.getElement(
		'.demo-root > .mobile'
	);

	/** @see Elements */
	public readonly heroText = Elements.getElement('#hero-section .hero-text');

	/** @see Elements */
	public readonly screenshotLaptop = Elements.getElement(
		'#hero-section .laptop.screenshot'
	);

	/** @see Elements */
	public readonly screenshotPhone = Elements.getElement(
		'#hero-section .phone.screenshot'
	);

	constructor () {}
}

/** @see Elements */
export const elements = new Elements();
