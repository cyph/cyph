import {IKeyPair} from '../../proto';


/** Equivalent to sodium.crypto_scalarmult. */
export interface IEphemeralKeyExchange {
	/** Private key length. */
	readonly privateKeyBytes: Promise<number>;

	/** Public key length. */
	readonly publicKeyBytes: Promise<number>;

	/** Shared secret length. */
	readonly secretBytes: Promise<number>;

	/** Generates Alice's key pair. */
	aliceKeyPair () : Promise<IKeyPair>;

	/** Computes secret for Alice using Bob's key. */
	aliceSecret (publicKey: Uint8Array, privateKey: Uint8Array) : Promise<Uint8Array>;

	/** Computes secret and key for Bob using Alice's key. */
	bobSecret (alicePublicKey: Uint8Array) : Promise<{publicKey: Uint8Array; secret: Uint8Array}>;
}
