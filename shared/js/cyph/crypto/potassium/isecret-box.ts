import {
	IPotassiumData,
	IPrivateKeyring,
	PotassiumData
} from '../../proto/types';

/** Equivalent to sodium.crypto_secretbox. */
export interface ISecretBox {
	/** Current algorithm to use for new data. */
	readonly currentAlgorithm: Promise<PotassiumData.SecretBoxAlgorithms>;

	/** @see PotassiumEncoding.deserialize */
	readonly defaultMetadata: Promise<
		IPotassiumData & {
			secretBoxAlgorithm: PotassiumData.SecretBoxAlgorithms;
		}
	>;

	/** Generates new secret key. */
	generateKey (
		algorithm?: PotassiumData.SecretBoxAlgorithms
	) : Promise<Uint8Array>;

	/** Additional data length. */
	getAeadBytes: (
		algorithm?: PotassiumData.SecretBoxAlgorithms
	) => Promise<number>;

	/** Key length. */
	getKeyBytes: (
		algorithm?: PotassiumData.SecretBoxAlgorithms
	) => Promise<number>;

	/** Decrypts cyphertext. */
	open (
		cyphertext: Uint8Array,
		key: Uint8Array | IPrivateKeyring,
		additionalData?: Uint8Array | string,
		defaultAlgorithm?: PotassiumData.SecretBoxAlgorithms
	) : Promise<Uint8Array>;

	/** Encrypts plaintext. */
	seal (
		plaintext: Uint8Array,
		key: Uint8Array | IPrivateKeyring,
		additionalData?: Uint8Array | string,
		rawOutput?: boolean,
		defaultAlgorithm?: PotassiumData.SecretBoxAlgorithms
	) : Promise<Uint8Array>;
}
