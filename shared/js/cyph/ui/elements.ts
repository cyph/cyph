module Cyph {
	export module UI {
		/**
		 * Non-project-specific UI elements.
		 */
		export class Elements {
			public static window: JQuery	= $(window);
			public static document: JQuery	= $(document);
			public static html: JQuery		= $('html');
			public static head: JQuery		= $('head');
			public static body: JQuery		= $('body');

			public static everything: JQuery;
			public static affiliateCheckbox: JQuery;
			public static buttons: JQuery;
			public static connectLinkInput: JQuery;
			public static connectLinkLink: JQuery;
			public static cyphertext: JQuery;
			public static footer: JQuery;
			public static insertPhotoMobile: JQuery;
			public static messageBox: JQuery;
			public static messageList: JQuery;
			public static messageListInner: JQuery;
			public static nanoScroller: JQuery;
			public static p2pContainer: JQuery;
			public static p2pFriendPlaceholder: JQuery;
			public static p2pFriendStream: JQuery;
			public static p2pMeStream: JQuery;
			public static p2pFiles: JQuery;
			public static sendButton: JQuery;
			public static signupForm: JQuery;
			public static timer: JQuery;

			/**
			 * Loads elements (call this after page is loaded).
			 */
			public static load () : void {
				Elements.everything				= $('*');
				Elements.affiliateCheckbox		= $('.amazon-link:visible md-checkbox');
				Elements.buttons				= $('.md-button');
				Elements.connectLinkInput		= $('.link-connection .connect-link-input input');
				Elements.connectLinkLink		= $('.link-connection .connect-link-link');
				Elements.cyphertext				= $('.chat-cyphertext.curtain, .chat-cyphertext.curtain > md-content');
				Elements.footer					= $('#footer');
				Elements.insertPhotoMobile		= $('.insert-photo-mobile');
				Elements.messageBox				= $('.message-box');
				Elements.messageList			= $('.message-list, .message-list > md-content');
				Elements.messageListInner		= $('.message-list md-list');
				Elements.nanoScroller			= $('.nano');
				Elements.p2pContainer			= $('.video-call');
				Elements.p2pFriendPlaceholder	= $('.video-call .friend:not(.stream)');
				Elements.p2pFriendStream		= $('.video-call .friend.stream');
				Elements.p2pMeStream			= $('.video-call .me');
				Elements.p2pFiles				= $('.send-file-button input[type="file"]');
				Elements.sendButton				= $('.send-button');
				Elements.signupForm				= $('.beta-signup-form');
				Elements.timer					= $('.link-connection .timer');
			}
		}
	}
}
