import {util} from '../util';


/**
 * Non-project-specific UI elements.
 */
export class Elements {
	/**
	 * jQuery wrapper that memoizes DOM elements for performance.
	 * @param selector
	 */
	public static getElement (
		selector: string|HTMLElement|Window|Document|(() => JQuery)
	) : () => JQuery {
		let cache: JQuery;

		const f	= typeof selector === 'function' ?
			selector :
			() => $(selector)
		;

		return () => {
			if (!cache || cache.length < 1) {
				cache			= f();
				cache.selector	= typeof selector === 'string' ? selector : '';
			}

			return cache;
		};
	}

	/**
	 * Waits until element exists before resolving promise.
	 * @param f
	 * @param length
	 */
	public static async waitForElement (
		f: () => JQuery,
		length: number = 1
	) : Promise<JQuery> {
		let $elem: JQuery|undefined;

		while (!$elem || $elem.length < length) {
			$elem	= f();
			await util.sleep();
		}

		return $elem;
	}


	/** @see Elements */
	public readonly window					= Elements.getElement(window);

	/** @see Elements */
	public readonly document				= Elements.getElement(document);

	/** @see Elements */
	public readonly html					= Elements.getElement('html');

	/** @see Elements */
	public readonly head					= Elements.getElement('head');

	/** @see Elements */
	public readonly body					= Elements.getElement('body');

	/** @see Elements */
	public readonly everything				= Elements.getElement('*');

	/** @see Elements */
	public readonly cyphertext				= Elements.getElement(
		'.chat-cyphertext > md2-content'
	);

	/** @see Elements */
	public readonly footer					= Elements.getElement('#footer');

	/** @see Elements */
	public readonly messageList				= Elements.getElement('.message-list > md2-content');

	/** @see Elements */
	public readonly messageListInner		= Elements.getElement('.message-list md-list');

	/** @see Elements */
	public readonly nanoScroller			= Elements.getElement('.nano');

	/** @see Elements */
	public readonly p2pFriendStream			= Elements.getElement('.video-call .friend.stream');

	/** @see Elements */
	public readonly p2pMeStream				= Elements.getElement('.video-call .me');

	/** @see Elements */
	public readonly signupForm				= Elements.getElement('.beta-signup-form');

	/** @see Elements */
	public readonly title					= Elements.getElement('title');

	constructor () {}
}

/** @see Elements */
export const elements	= new Elements();
