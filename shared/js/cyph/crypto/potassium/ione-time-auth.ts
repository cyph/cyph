/** Equivalent to sodium.crypto_onetimeauth. */
export interface IOneTimeAuth {
	/** MAC length. */
	readonly bytes: Promise<number>;

	/** Key length. */
	readonly keyBytes: Promise<number>;

	/** Signs message. */
	sign (message: Uint8Array, key: Uint8Array) : Promise<Uint8Array>;

	/** Verifies MAC. */
	verify (mac: Uint8Array, message: Uint8Array, key: Uint8Array) : Promise<boolean>;
}
