module Cyph {
	export module Session {
		/**
		 * Representations of users in a session.
		 */
		export enum Authors {
			me,
			friend,
			app
		}

		/**
		 * Session-related events that may be handled throughout the codes.
		 */
		export class Events {
			public static abort: string				= 'abort';
			public static beginChat: string			= 'beginChat';
			public static beginChatComplete: string	= 'beginChatComplete';
			public static beginWaiting: string		= 'beginWaiting';
			public static closeChat: string			= 'closeChat';
			public static connect: string			= 'connect';
			public static cyphertext: string		= 'cyphertext';
			public static newChannel: string		= 'newChannel';
			public static newCyph: string			= 'newCyph';
			public static otr: string				= 'otr';
			public static p2pUi: string				= 'p2pUi';
			public static pingPongTimeout: string	= 'pingPongTimeout';
			public static smp: string				= 'smp';
		}

		/**
		 * OTR-specific events (handled within Session).
		 */
		export enum OTREvents {
			abort,
			authenticated,
			begin,
			receive,
			send
		}

		/**
		 * Subset of events allowed to be remotely triggered by other parties.
		 */
		export const RPCEvents	= {
			channelRatchet: 'channelRatchet',
			destroy: 'destroy',
			mutex: 'mutex',
			p2p: 'p2p',
			text: 'text',
			typing: 'typing'
		};

		/**
		 * Session state value keys.
		 */
		export class State {
			public static cyphId: string				= 'cyphId';
			public static sharedSecret: string			= 'sharedSecret';
			public static isAlive: string				= 'isAlive';
			public static isCreator: string				= 'isCreator';
			public static isStartingNewCyph: string		= 'isStartingNewCyph';
		}

		/**
		 * Used by ThreadedSession for cross-thread method calls.
		 */
		export const ThreadedSessionEvents	= {
			close: 'close-ThreadedSession',
			receive: 'receive-ThreadedSession',
			send: 'send-ThreadedSession',
			sendText: 'sendText-ThreadedSession',
			updateState: 'updateState-ThreadedSession',
			updateStateThread: 'updateStateThread-ThreadedSession'
		};
	}
}
