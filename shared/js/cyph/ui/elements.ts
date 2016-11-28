/**
 * Non-project-specific UI elements.
 */
export class Elements {
	/** @see Elements */
	public static readonly window				= Elements.get(window);

	/** @see Elements */
	public static readonly document				= Elements.get(document);

	/** @see Elements */
	public static readonly html					= Elements.get('html');

	/** @see Elements */
	public static readonly head					= Elements.get('head');

	/** @see Elements */
	public static readonly body					= Elements.get('body');

	/** @see Elements */
	public static readonly everything			= Elements.get('*');

	/** @see Elements */
	public static readonly affiliateCheckbox	= Elements.get('.amazon-link:visible md-checkbox');

	/** @see Elements */
	public static readonly buttons				= Elements.get('.md-button');

	/** @see Elements */
	public static readonly connectLinkInput		= Elements.get(
		'.link-connection .connect-link-input input'
	);

	/** @see Elements */
	public static readonly connectLinkLink		= Elements.get(
		'.link-connection .connect-link-link'
	);

	/** @see Elements */
	public static readonly cyphertext			= Elements.get(
		'.chat-cyphertext.curtain, .chat-cyphertext.curtain > md-content'
	);

	/** @see Elements */
	public static readonly footer				= Elements.get('#footer');

	/** @see Elements */
	public static readonly messageBox			= Elements.get('.message-box');

	/** @see Elements */
	public static readonly messageList			= Elements.get(
		'.message-list, .message-list > md-content'
	);

	/** @see Elements */
	public static readonly messageListInner		= Elements.get('.message-list md-list');

	/** @see Elements */
	public static readonly nanoScroller			= Elements.get('.nano');

	/** @see Elements */
	public static readonly p2pFriendPlaceholder	= Elements.get('.video-call .friend:not(.stream)');

	/** @see Elements */
	public static readonly p2pFriendStream		= Elements.get('.video-call .friend.stream');

	/** @see Elements */
	public static readonly p2pMeStream			= Elements.get('.video-call .me');

	/** @see Elements */
	public static readonly signupForm			= Elements.get('.beta-signup-form');

	/** @see Elements */
	public static readonly title				= Elements.get('title');

	/** jQuery wrapper that memoizes DOM elements for performance. */
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
}
