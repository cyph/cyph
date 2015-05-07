module Cyph.im {
	export module UI {
		/**
		 * Possible states of cyph.im UI.
		 */
		export enum States {
			none,
			blank,
			chat,
			error,
			spinningUp,
			waitingForFriend,
			webSignChanged
		}
	}
}
