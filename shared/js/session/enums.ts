/// <reference path="../globals.ts" />


module Session {
	export enum Authors {
		me,
		friend,
		app
	}

	export class Events {
		public static beginChat: string			= 'beginChat';
		public static channelRatchet: string	= 'channelRatchet';
		public static closeChat: string			= 'closeChat';
		public static destroy: string			= 'destroy';
		public static mutex: string				= 'mutex';
		public static text: string				= 'text';
		public static typing: string			= 'typing';
		public static p2p: string				= 'p2p';
	}
}
