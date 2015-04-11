/// <reference path="../globals.ts" />


module Session {
	export enum Authors {
		me,
		friend,
		app
	}

	export class Events {
		public static beginChat: string			= 'beginChat';
		public static beginWaiting: string		= 'beginWaiting';
		public static channelRatchet: string	= 'channelRatchet';
		public static closeChat: string			= 'closeChat';
		public static cyphertext: string		= 'cyphertext';
		public static destroy: string			= 'destroy';
		public static mutex: string				= 'mutex';
		public static newCyph: string			= 'newCyph';
		public static otr: string				= 'otr';
		public static p2p: string				= 'p2p';
		public static p2pUi: string				= 'p2pUi';
		public static smp: string				= 'smp';
		public static text: string				= 'text';
		public static typing: string			= 'typing';
	}

	export enum OTREvents {
		abort,
		authenticated,
		begin,
		receive,
		send
	}

	export module P2PUIEvents {
		export enum Categories {
			base,
			file,
			request,
			stream
		}

		export enum Events {
			/* base */
			connected,
			enable,
			videoToggle,

			/* file */
			clear,
			confirm,
			get,
			rejected,
			tooLarge,
			transferStarted,

			/* request */
			acceptConfirm,
			acceptConfirmation,
			requestConfirm,
			requestConfirmation,
			requestRejection,

			/* stream */
			play,
			set
		}
	}
}
