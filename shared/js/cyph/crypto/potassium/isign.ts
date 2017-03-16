import {IKeyPair} from '../ikey-pair';


/** Equivalent to sodium.crypto_sign. */
export interface ISign {
	/** Signature length. */
	readonly bytes: number;

	/** Private key length. */
	readonly privateKeyBytes: number;

	/** Public key length. */
	readonly publicKeyBytes: number;

	/** Generates key pair. */
	keyPair () : Promise<IKeyPair>;

	/** Verifies combined signature and returns original message. */
	open (
		signed: Uint8Array|string,
		publicKey: Uint8Array
	) : Promise<string>;

	/** Signs message and returns it combined with signature. */
	sign (
		message: Uint8Array|string,
		privateKey: Uint8Array
	) : Promise<string>;

	/** Signs message and returns only the signature. */
	signDetached (
		message: Uint8Array|string,
		privateKey: Uint8Array
	) : Promise<string>;

	/** Verifies signature. */
	verifyDetached (
		signature: Uint8Array|string,
		message: Uint8Array|string,
		publicKey: Uint8Array
	) : Promise<boolean>;
}
