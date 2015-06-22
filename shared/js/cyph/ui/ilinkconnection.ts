module Cyph {
	export module UI {
		/**
		 * Represents a link-based initial connection screen
		 * (e.g. for starting a new cyph).
		 * @interface
		 */
		export interface ILinkConnection {
			/** The link to join this connection. */
			link: string;

			/** URL-encoded version of this link (for sms and mailto links). */
			linkEncoded: string;

			/**
			 * Initiates UI for sending this link to friend.
			 */
			beginWaiting () : void;

			/**
			 * Stops waiting and tears down this link connection instance.
			 */
			stop () : void;
		}
	}
}
