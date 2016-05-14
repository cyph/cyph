/**
 * Represents a Castle encryption instance.
 * @interface
 */
export interface ICastle {
	/**
	 * Receive incoming cyphertext.
	 * @param message Data to be decrypted.
	 */
	receive (message: string) : void;

	/**
	 * Send outgoing text.
	 * @param message Data to be encrypted.
	 */
	send (message: string) : void;
}
