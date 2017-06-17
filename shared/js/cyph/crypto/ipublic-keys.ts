/**
 * Represents a set of public keys.
 */
export interface IPublicKeys {
	/** Encryption key (Potassium.Box). */
	encryption: Uint8Array;

	/** Signing key (Potassium.Sign). */
	signing: Uint8Array;
}
