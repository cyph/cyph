import {
	IKeyPair,
	IPrivateKeyring,
	IPublicKeyring,
	PotassiumData
} from '../../proto/types';

/** Equivalent to sodium.crypto_box. */
export interface IBox {
	/** Current algorithm to use for new data. */
	readonly currentAlgorithm: Promise<PotassiumData.BoxAlgorithms>;

	/** Private key length. */
	getPrivateKeyBytes: (
		algorithm?: PotassiumData.BoxAlgorithms
	) => Promise<number>;

	/** Public key length. */
	getPublicKeyBytes: (
		algorithm?: PotassiumData.BoxAlgorithms
	) => Promise<number>;

	/** Generates key pair. */
	keyPair (algorithm?: PotassiumData.BoxAlgorithms) : Promise<IKeyPair>;

	/** Decrypts cyphertext. */
	open (
		cyphertext: Uint8Array,
		keyPair: IKeyPair | IPrivateKeyring
	) : Promise<Uint8Array>;

	/** Encrypts plaintext. */
	seal (
		plaintext: Uint8Array,
		publicKey: Uint8Array | IPublicKeyring
	) : Promise<Uint8Array>;
}
