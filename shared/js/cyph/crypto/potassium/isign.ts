import {IKeyPair, PotassiumData} from '../../proto/types';

/** Equivalent to sodium.crypto_sign. */
export interface ISign {
	/** Current algorithm to use for new data. */
	readonly currentAlgorithm: Promise<PotassiumData.SignAlgorithms>;

	/** Signature length. */
	getBytes: (algorithm?: PotassiumData.SignAlgorithms) => Promise<number>;

	/** Private key length. */
	getPrivateKeyBytes: (
		algorithm?: PotassiumData.SignAlgorithms
	) => Promise<number>;

	/** Public key length. */
	getPublicKeyBytes: (
		algorithm?: PotassiumData.SignAlgorithms
	) => Promise<number>;

	/** Builds ISign public key from base64-encoded public sub-keys. */
	importPublicKeys (
		algorithm: PotassiumData.SignAlgorithms,
		classical: string | Uint8Array,
		postQuantum: string | Uint8Array
	) : Promise<Uint8Array>;

	/** Generates key pair. */
	keyPair (algorithm?: PotassiumData.SignAlgorithms) : Promise<IKeyPair>;

	/** Verifies combined signature and returns original message. */
	open (
		signed: Uint8Array | string,
		publicKey: Uint8Array,
		additionalData?: Uint8Array | string,
		decompressByDefault?: boolean
	) : Promise<Uint8Array>;

	/** Signs message and returns it combined with signature. */
	sign (
		message: Uint8Array | string,
		privateKey: Uint8Array,
		additionalData?: Uint8Array | string,
		compress?: boolean
	) : Promise<Uint8Array>;

	/** Signs message and returns only the signature. */
	signDetached (
		message: Uint8Array | string,
		privateKey: Uint8Array,
		additionalData?: Uint8Array | string
	) : Promise<Uint8Array>;

	/** Verifies signature. */
	verifyDetached (
		signature: Uint8Array | string,
		message: Uint8Array | string,
		publicKey: Uint8Array,
		additionalData?: Uint8Array | string
	) : Promise<boolean>;
}
