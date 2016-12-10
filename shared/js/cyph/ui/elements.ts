import {util} from '../util';


/**
 * Non-project-specific UI elements.
 */
export class Elements {
	/**
	 * jQuery wrapper that memoizes DOM elements for performance.
	 * @param selector
	 */
	public static get (
		selector: string|HTMLElement|Window|Document|(() => JQuery)
	) : () => JQuery {
		let cache: JQuery;

		const f	= typeof selector === 'function' ?
			selector :
			() => $(selector);
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
		let $elem: JQuery;

		while (!$elem || $elem.length < length) {
			$elem	= f();
			await util.sleep();
		}

		return $elem;
	}


	/** @see Elements */
	public readonly window					= Elements.get(window);

	/** @see Elements */
	public readonly document				= Elements.get(document);

	/** @see Elements */
	public readonly html					= Elements.get('html');

	/** @see Elements */
	public readonly head					= Elements.get('head');

	/** @see Elements */
	public readonly body					= Elements.get('body');

	/** @see Elements */
	public readonly everything				= Elements.get('*');

	/** @see Elements */
	public readonly cyphertext				= Elements.get('.chat-cyphertext > md2-content');

	/** @see Elements */
	public readonly footer					= Elements.get('#footer');

	/** @see Elements */
	public readonly messageList				= Elements.get('.message-list > md2-content');

	/** @see Elements */
	public readonly messageListInner		= Elements.get('.message-list md-list');

	/** @see Elements */
	public readonly nanoScroller			= Elements.get('.nano');

	/** @see Elements */
	public readonly p2pFriendStream			= Elements.get('.video-call .friend.stream');

	/** @see Elements */
	public readonly p2pMeStream				= Elements.get('.video-call .me');

	/** @see Elements */
	public readonly signupForm				= Elements.get('.beta-signup-form');

	/** @see Elements */
	public readonly title					= Elements.get('title');

	constructor () {}
}

/** @see Elements */
export const elements	= new Elements();
