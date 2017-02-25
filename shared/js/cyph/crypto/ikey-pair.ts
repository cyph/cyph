/**
 * Represents an asymmetric key pair.
 */
export interface IKeyPair {
	privateKey: Uint8Array;

	publicKey: Uint8Array;

	keyType?: string;
}
