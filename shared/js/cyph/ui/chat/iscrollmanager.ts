module Cyph {
	export module UI {
		export module Chat {
			/**
			 * Manages scrolling and scroll-detection within a chat component.
			 * @interface
			 */
			export interface IScrollManager {
				/** Number of messages that haven't appeared in viewport */
				unreadMessages: number;

				/**
				 * Scrolls to bottom of message list
				 * @param shouldScrollCyphertext If true, scrolls cyphertext UI
				 * instead of main message list
				 */
				scrollDown (shouldScrollCyphertext?: boolean) : void;
			}
		}
	}
}
