module Cyph {
	export module UI {
		export module Chat {
			/**
			 * Possible states of chat UI.
			 */
			export enum States {
				none,
				aborted,
				chat,
				chatBeginMessage,
				keyExchange
			}
		}
	}
}
