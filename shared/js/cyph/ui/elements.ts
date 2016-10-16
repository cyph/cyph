/**
 * Non-project-specific UI elements.
 */
export class Elements {
	public static window				= Elements.get(window);
	public static document				= Elements.get(document);
	public static html					= Elements.get('html');
	public static head					= Elements.get('head');
	public static body					= Elements.get('body');
	public static everything			= Elements.get('*');
	public static affiliateCheckbox		= Elements.get('.amazon-link:visible md-checkbox');
	public static buttons				= Elements.get('.md-button');
	public static connectLinkInput		= Elements.get('.link-connection .connect-link-input input');
	public static connectLinkLink		= Elements.get('.link-connection .connect-link-link');
	public static cyphertext			= Elements.get('.chat-cyphertext.curtain, .chat-cyphertext.curtain > md-content');
	public static footer				= Elements.get('#footer');
	public static messageBox			= Elements.get('.message-box');
	public static messageList			= Elements.get('.message-list, .message-list > md-content');
	public static messageListInner		= Elements.get('.message-list md-list');
	public static nanoScroller			= Elements.get('.nano');
	public static p2pContainer			= Elements.get('.video-call');
	public static p2pFriendPlaceholder	= Elements.get('.video-call .friend:not(.stream)');
	public static p2pFriendStream		= Elements.get('.video-call .friend.stream');
	public static p2pMeStream			= Elements.get('.video-call .me');
	public static sendButton			= Elements.get('.send-button');
	public static signupForm			= Elements.get('.beta-signup-form');
	public static title					= Elements.get('title');

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
