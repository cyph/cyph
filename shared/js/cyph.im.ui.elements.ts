/// <reference path="globals.ts" />
/// <reference path="../lib/typings/jquery/jquery.d.ts" />


module UI {
	class Elements {
		public static window: JQuery			= $(window);
		public static html: JQuery				= $('html');
		public static everything: JQuery		= $('*');
		public static messageBox: JQuery		= $('#message-box');
		public static messageList: JQuery		= $('#message-list, #message-list > md-content');
		public static timer: JQuery				= $('#timer');
		public static buttons: JQuery			= $('.md-button:not(#templates *)');
		public static copyUrlInput: JQuery		= $('#copy-url-input input');
		public static copyUrlLink: JQuery		= $('#copy-url-link');
		public static cyphertext: JQuery		= $('#cyphertext.curtain, #cyphertext.curtain > md-content');
		public static sendButton: JQuery		= $('#send-button');
		public static insertPhotoMobile: JQuery	= $('#insert-photo-mobile');
	}
}
