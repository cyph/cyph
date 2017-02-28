/**
 * Represents a possible asymmetric key pair.
 */
export interface IKeyPairMaybe {
	/** Optional description of key type. */
	keyType?: string;

	/** Private key. */
	privateKey: Uint8Array|undefined;

	/** Public key. */
	publicKey: Uint8Array|undefined;
}
