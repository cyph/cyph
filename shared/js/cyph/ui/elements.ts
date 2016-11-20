/**
 * Non-project-specific UI elements.
 */
export class Elements {
	/** @see Elements */
	public static window				= Elements.get(window);

	/** @see Elements */
	public static document				= Elements.get(document);

	/** @see Elements */
	public static html					= Elements.get('html');

	/** @see Elements */
	public static head					= Elements.get('head');

	/** @see Elements */
	public static body					= Elements.get('body');

	/** @see Elements */
	public static everything			= Elements.get('*');

	/** @see Elements */
	public static affiliateCheckbox		= Elements.get('.amazon-link:visible md-checkbox');

	/** @see Elements */
	public static buttons				= Elements.get('.md-button');

	/** @see Elements */
	public static connectLinkInput		= Elements.get(
		'.link-connection .connect-link-input input'
	);

	/** @see Elements */
	public static connectLinkLink		= Elements.get('.link-connection .connect-link-link');

	/** @see Elements */
	public static cyphertext			= Elements.get(
		'.chat-cyphertext.curtain, .chat-cyphertext.curtain > md-content'
	);

	/** @see Elements */
	public static footer				= Elements.get('#footer');

	/** @see Elements */
	public static messageBox			= Elements.get('.message-box');

	/** @see Elements */
	public static messageList			= Elements.get(
		'.message-list, .message-list > md-content'
	);

	/** @see Elements */
	public static messageListInner		= Elements.get('.message-list md-list');

	/** @see Elements */
	public static nanoScroller			= Elements.get('.nano');

	/** @see Elements */
	public static p2pContainer			= Elements.get('.video-call');

	/** @see Elements */
	public static p2pFriendPlaceholder	= Elements.get('.video-call .friend:not(.stream)');

	/** @see Elements */
	public static p2pFriendStream		= Elements.get('.video-call .friend.stream');

	/** @see Elements */
	public static p2pMeStream			= Elements.get('.video-call .me');

	/** @see Elements */
	public static sendButton			= Elements.get('.send-button');

	/** @see Elements */
	public static signupForm			= Elements.get('.beta-signup-form');

	/** @see Elements */
	public static title					= Elements.get('title');

	/** jQuery wrapper that memoizes DOM elements for performance. */
	public static get (selector: any) : () => JQuery {
		let cache: JQuery;

		const f	= typeof selector === 'function' ?
			selector :
			() => $(selector)
		;

		return () => {
			if (!cache || cache.length < 1) {
				cache	= f();
			}

			return cache;
		};
	}
}
