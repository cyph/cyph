/** Equivalent to sodium.crypto_onetimeauth. */
export interface IOneTimeAuth {
	/** MAC length. */
	readonly bytes: number;

	/** Key length. */
	readonly keyBytes: number;

	/** Signs message. */
	sign (message: Uint8Array, key: Uint8Array) : Promise<Uint8Array>;

	/** Verifies MAC. */
	verify (mac: Uint8Array, message: Uint8Array, key: Uint8Array) : Promise<boolean>;
}
