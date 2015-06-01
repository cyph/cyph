module Cyph {
	export module Session {
		/**
		 * Represents OTR (or OTR-like) encryption instance.
		 * @interface
		 */
		export interface IOTR {
			/**
			 * Receive incoming cyphertext.
			 * @param message Data to be decrypted.
			 */
			receive (message?: string) : void;

			/**
			 * Send outgoing text.
			 * @param message Data to be encrypted.
			 */
			send (message: string) : void;
		}
	}
}
