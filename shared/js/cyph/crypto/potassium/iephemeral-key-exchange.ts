import {
	IKeyPair,
	IPotassiumData,
	IPrivateKeyring,
	IPublicKeyring,
	PotassiumData
} from '../../proto/types';

/** Equivalent to sodium.crypto_scalarmult. */
export interface IEphemeralKeyExchange {
	/** Current algorithm to use for new data. */
	readonly currentAlgorithm: Promise<PotassiumData.EphemeralKeyExchangeAlgorithms>;

	/** @see PotassiumEncoding.deserialize */
	readonly defaultMetadata: Promise<
		IPotassiumData & {
			ephemeralKeyExchangeAlgorithm: PotassiumData.EphemeralKeyExchangeAlgorithms;
		}
	>;

	/** Generates Alice's key pair. */
	aliceKeyPair (
		algorithm?: PotassiumData.EphemeralKeyExchangeAlgorithms
	) : Promise<IKeyPair>;

	/** Computes secret for Alice using Bob's key. */
	aliceSecret (
		publicKey: Uint8Array | IPublicKeyring,
		privateKey: Uint8Array | IPrivateKeyring,
		rawOutput?: boolean
	) : Promise<Uint8Array>;

	/** Computes secret and key for Bob using Alice's key. */
	bobSecret (
		alicePublicKey: Uint8Array | IPublicKeyring,
		rawOutput?: boolean
	) : Promise<{publicKey: Uint8Array; secret: Uint8Array}>;

	/** Private key length. */
	getPrivateKeyBytes: (
		algorithm?: PotassiumData.EphemeralKeyExchangeAlgorithms
	) => Promise<number>;

	/** Public key length. */
	getPublicKeyBytes: (
		algorithm?: PotassiumData.EphemeralKeyExchangeAlgorithms
	) => Promise<number>;

	/** Shared secret length. */
	getSecretBytes: (
		algorithm?: PotassiumData.EphemeralKeyExchangeAlgorithms
	) => Promise<number>;
}
