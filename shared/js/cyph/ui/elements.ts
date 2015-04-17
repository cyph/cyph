/// <reference path="../../global/base.ts" />
/// <reference path="../../../lib/typings/jquery/jquery.d.ts" />


module Cyph {
	export module UI {
		export class Elements {
			public static window: JQuery				= $(window);
			public static html: JQuery					= $('html');
			public static everything: JQuery			= $('*');
			public static affiliateCheckbox: JQuery		= $('.amazon-link:visible md-checkbox');
			public static buttons: JQuery				= $('.md-button:not(#templates *)');
			public static copyUrlInput: JQuery			= $('#copy-url-input input');
			public static copyUrlLink: JQuery			= $('#copy-url-link');
			public static cyphertext: JQuery			= $('#cyphertext.curtain, #cyphertext.curtain > md-content');
			public static insertPhotoMobile: JQuery		= $('#insert-photo-mobile');
			public static messageBox: JQuery			= $('#message-box');
			public static messageList: JQuery			= $('#message-list, #message-list > md-content');
			public static p2pFriendPlaceholder: JQuery	= $('#video-call .friend:not(.stream)');
			public static p2pFriendStream: JQuery		= $('#video-call .friend.stream');
			public static p2pMeStream: JQuery			= $('#video-call .me');
			public static p2pFiles: JQuery				= $('.send-file-button input[type="file"]');
			public static sendButton: JQuery			= $('#send-button');
			public static signupForm: JQuery			= $('.beta-signup-form');
			public static timer: JQuery					= $('#timer');

			public static load () : void {
				Object.keys(Elements).
					filter((k: string) => k !== 'load').
					forEach((k: string) =>
						Elements[k]	= $(Elements[k].selector)
					)
				;
			}
		}
	}
}
