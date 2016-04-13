namespace Cyph {
	export namespace UI {
		/**
		 * Represents a link-based initial connection screen
		 * (e.g. for starting a new cyph).
		 * @interface
		 */
		export interface ILinkConnection {
			/** Total amount of time for which this link will remain active. */
			countdown: number;

			/**
			 * Indicates whether this link connection was initiated passively
			 * via API integration.
			 */
			isPassive: boolean;

			/** The link to join this connection. */
			link: string;

			/** URL-encoded version of this link (for sms and mailto links). */
			linkEncoded: string;

			/**
			 * Initiates UI for sending this link to friend.
			 * @param baseUrl Base URL before the hash.
			 * @param secret Secret being sent via URL fragment.
			 * @param isPassive
			 */
			beginWaiting (baseUrl: string, secret: string, isPassive: boolean) : void;

			/**
			 * Stops waiting and tears down this link connection instance.
			 */
			stop () : void;
		}
	}
}
