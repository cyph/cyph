/** Equivalent to sodium.crypto_pwhash. */
export interface IPasswordHash {
	/** Algorithm name. */
	readonly algorithm: Promise<string>;

	/** Moderate mem limit. */
	readonly memLimitInteractive: Promise<number>;

	/** Heavy mem limit. */
	readonly memLimitSensitive: Promise<number>;

	/** Moderate ops limit. */
	readonly opsLimitInteractive: Promise<number>;

	/** Heavy ops limit. */
	readonly opsLimitSensitive: Promise<number>;

	/** Salt length. */
	readonly saltBytes: Promise<number>;

	/** Hashes plaintext. */
	hash (
		plaintext: Uint8Array|string,
		salt?: Uint8Array|string,
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
