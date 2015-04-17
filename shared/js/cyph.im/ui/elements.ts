/// <reference path="../../global/base.ts" />
/// <reference path="../../../lib/typings/jquery/jquery.d.ts" />


module Cyph.im {
	export module UI {
		export class Elements extends Cyph.UI.Elements {
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
			public static timer: JQuery					= $('#timer');

			public static load () : void {
				super.load();
				super.loadHelper(Elements);
			}
		}
	}
}
