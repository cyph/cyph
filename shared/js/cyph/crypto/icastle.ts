import {Observable} from 'rxjs';

/**
 * Represents a Castle encryption instance.
 */
export interface ICastle {
	/**
	 * Receive incoming cyphertext.
	 * @param cyphertext Data to be decrypted.
	 * @param initial Indicates whether part of initial batch of messages.
	 */
	receive (cyphertext: Uint8Array, initial: boolean) : Promise<void>;

	/** @see IPairwiseSession.remoteUsername */
	readonly remoteUsername: Promise<Observable<string>>;

	/**
	 * Send outgoing text.
	 * @param plaintext Data to be encrypted.
	 * @param timestamp Message timestamp.
	 */
	send (plaintext: string, timestamp?: number) : Promise<void>;
}
