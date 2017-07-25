/** Equivalent to sodium.crypto_secretbox. */
export interface ISecretBox {
	/** Additional data length. */
	readonly aeadBytes: Promise<number>;

	/** Key length. */
	readonly keyBytes: Promise<number>;

	/** Decrypts cyphertext. */
	open (
		cyphertext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array|string
	) : Promise<Uint8Array>;

	/** Encrypts plaintext. */
	seal (
		plaintext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array|string
	) : Promise<Uint8Array>;
}
