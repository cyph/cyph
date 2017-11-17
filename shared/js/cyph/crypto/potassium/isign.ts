import {IKeyPair} from '../../proto';


/** Equivalent to sodium.crypto_sign. */
export interface ISign {
	/** Signature length. */
	readonly bytes: Promise<number>;

	/** Private key length. */
	readonly privateKeyBytes: Promise<number>;

	/** Public key length. */
	readonly publicKeyBytes: Promise<number>;

	/** Builds ISign public key from base64-encoded RSA and SPHINCS public keys. */
	importSuperSphincsPublicKeys (rsa: string, sphincs: string) : Promise<Uint8Array>;

	/** Generates key pair. */
	keyPair () : Promise<IKeyPair>;

	/** Verifies combined signature and returns original message. */
	open (
		signed: Uint8Array|string,
		publicKey: Uint8Array,
		additionalData?: Uint8Array|string,
		decompress?: boolean
	) : Promise<Uint8Array>;

	/** Signs message and returns it combined with signature. */
	sign (
		message: Uint8Array|string,
		privateKey: Uint8Array,
		additionalData?: Uint8Array|string,
		compress?: boolean
	) : Promise<Uint8Array>;

	/** Signs message and returns only the signature. */
	signDetached (
		message: Uint8Array|string,
		privateKey: Uint8Array,
		additionalData?: Uint8Array|string
	) : Promise<Uint8Array>;

	/** Verifies signature. */
	verifyDetached (
		signature: Uint8Array|string,
		message: Uint8Array|string,
		publicKey: Uint8Array,
		additionalData?: Uint8Array|string
	) : Promise<boolean>;
}
