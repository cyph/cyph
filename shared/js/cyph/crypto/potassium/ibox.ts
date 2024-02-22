import type {
	IKeyPair,
	IPotassiumData,
	IPrivateKeyring,
	IPublicKeyring,
	PotassiumData
} from '../../proto/types';

/** Equivalent to sodium.crypto_box. */
export interface IBox {
	/** List of supported algorithms in descending priority. */
	readonly algorithmPriorityOrder: Promise<PotassiumData.BoxAlgorithms[]>;

	/** Current algorithm to use for new data. */
	readonly currentAlgorithm: Promise<PotassiumData.BoxAlgorithms>;

	/** @see PotassiumEncoding.deserialize */
	readonly defaultMetadata: Promise<
		IPotassiumData & {
			boxAlgorithm: PotassiumData.BoxAlgorithms;
		}
	>;

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
		publicKey: Uint8Array | IPublicKeyring,
		rawOutput?: boolean
	) : Promise<Uint8Array>;
}
