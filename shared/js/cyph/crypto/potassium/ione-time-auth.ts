import {
	IPotassiumData,
	IPrivateKeyring,
	PotassiumData
} from '../../proto/types';

/** Equivalent to sodium.crypto_onetimeauth. */
export interface IOneTimeAuth {
	/** List of supported algorithms in descending priority. */
	readonly algorithmPriorityOrder: Promise<
		PotassiumData.OneTimeAuthAlgorithms[]
	>;

	/** Current algorithm to use for new data. */
	readonly currentAlgorithm: Promise<PotassiumData.OneTimeAuthAlgorithms>;

	/** @see PotassiumEncoding.deserialize */
	readonly defaultMetadata: Promise<
		IPotassiumData & {
			oneTimeAuthAlgorithm: PotassiumData.OneTimeAuthAlgorithms;
		}
	>;

	/** Generates new secret key. */
	generateKey (
		algorithm?: PotassiumData.OneTimeAuthAlgorithms
	) : Promise<Uint8Array>;

	/** MAC length. */
	getBytes: (
		algorithm?: PotassiumData.OneTimeAuthAlgorithms
	) => Promise<number>;

	/** Key length. */
	getKeyBytes: (
		algorithm?: PotassiumData.OneTimeAuthAlgorithms
	) => Promise<number>;

	/** Signs message. */
	sign (
		message: Uint8Array,
		key: Uint8Array | IPrivateKeyring,
		rawOutput?: boolean,
		forceAlgorithm?: PotassiumData.OneTimeAuthAlgorithms
	) : Promise<Uint8Array>;

	/** Verifies MAC. */
	verify (
		mac: Uint8Array,
		message: Uint8Array,
		key: Uint8Array | IPrivateKeyring,
		forceAlgorithm?: PotassiumData.OneTimeAuthAlgorithms
	) : Promise<boolean>;
}
