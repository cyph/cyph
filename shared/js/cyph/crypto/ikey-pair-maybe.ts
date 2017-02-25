/**
 * Represents a possible asymmetric key pair.
 */
export interface IKeyPairMaybe {
	privateKey: Uint8Array|undefined;

	publicKey: Uint8Array|undefined;

	keyType?: string;
}
