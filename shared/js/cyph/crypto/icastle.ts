/**
 * Represents a Castle encryption instance.
 */
export interface ICastle {
	/**
	 * Receive incoming cyphertext.
	 * @param cyphertext Data to be decrypted.
	 */
	receive (cyphertext: Uint8Array) : Promise<void>;

	/**
	 * Send outgoing text.
	 * @param plaintext Data to be encrypted.
	 * @param timestamp Message timestamp.
	 */
	send (plaintext: string, timestamp?: number) : Promise<void>;
}
