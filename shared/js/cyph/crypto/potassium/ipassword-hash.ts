/** Equivalent to sodium.crypto_pwhash. */
export interface IPasswordHash {
	/** Algorithm name. */
	readonly algorithm: string;

	/** Moderate mem limit. */
	readonly memLimitInteractive: number;

	/** Heavy mem limit. */
	readonly memLimitSensitive: number;

	/** Moderate ops limit. */
	readonly opsLimitInteractive: number;

	/** Heavy ops limit. */
	readonly opsLimitSensitive: number;

	/** Salt length. */
	readonly saltBytes: number;

	/** Hashes plaintext. */
	hash (
		plaintext: Uint8Array|string,
		salt?: Uint8Array,
		outputBytes?: number,
		opsLimit?: number,
		memLimit?: number,
		clearInput?: boolean
	) : Promise<{
		hash: Uint8Array;
		metadata: Uint8Array;
		metadataObject: {
			algorithm: string;
			memLimit: number;
			opsLimit: number;
			salt: Uint8Array;
		};
	}>;

	/** Parses metadata byte array into usable object. */
	parseMetadata (metadata: Uint8Array) : Promise<{
		algorithm: string;
		memLimit: number;
		opsLimit: number;
		salt: Uint8Array;
	}>;
}
