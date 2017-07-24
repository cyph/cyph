/** Equivalent to sodium.crypto_generichash. */
export interface IHash {
	/** Hash length. */
	readonly bytes: Promise<number>;

	/** Stretches input to the specified number of bytes. */
	deriveKey (
		input: Uint8Array|string,
		outputBytes?: number,
		clearInput?: boolean
	) : Promise<Uint8Array>;

	/** Hashes plaintext. */
	hash (plaintext: Uint8Array|string) : Promise<Uint8Array>;
}
