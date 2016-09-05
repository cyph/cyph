/**
 * Represents a Castle encryption instance.
 * @interface
 */
export interface ICastle {
	/**
	 * Receive incoming cyphertext.
	 * @param cyphertext Data to be decrypted.
	 */
	receive (cyphertext: string) : void;

	/**
	 * Send outgoing text.
	 * @param plaintext Data to be encrypted.
	 * @param timestamp Message timestamp.
	 */
	send (plaintext: string, timestamp?: number) : Promise<void>;
}
