import {PotassiumData} from '../../proto/types';

/** Equivalent to sodium.crypto_secretbox. */
export interface ISecretBox {
	/** Current algorithm to use for new data. */
	readonly currentAlgorithm: Promise<PotassiumData.SecretBoxAlgorithms>;

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
		key: Uint8Array,
		additionalData?: Uint8Array | string
	) : Promise<Uint8Array>;

	/** Encrypts plaintext. */
	seal (
		plaintext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array | string
	) : Promise<Uint8Array>;
}
