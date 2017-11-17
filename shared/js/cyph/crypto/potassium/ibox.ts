import {IKeyPair} from '../../proto';


/** Equivalent to sodium.crypto_box. */
export interface IBox {
	/** Private key length. */
	readonly privateKeyBytes: Promise<number>;

	/** Public key length. */
	readonly publicKeyBytes: Promise<number>;

	/** Generates key pair. */
	keyPair () : Promise<IKeyPair>;

	/** Decrypts cyphertext. */
	open (cyphertext: Uint8Array, keyPair: IKeyPair) : Promise<Uint8Array>;

	/** Encrypts plaintext. */
	seal (plaintext: Uint8Array, publicKey: Uint8Array) : Promise<Uint8Array>;
}
