import {Hash} from './hash';
import {lib} from './lib';
import {util} from './util';


/** Equivalent to sodium.crypto_scalarmult. */
export class EphemeralKeyExchange {
	/** Private key length. */
	public readonly privateKeyBytes: number	=
		lib.rlwe.privateKeyLength +
		lib.sodium.crypto_scalarmult_SCALARBYTES
	;

	/** Public key length. */
	public readonly publicKeyBytes: number	=
		lib.rlwe.publicKeyLength +
		lib.sodium.crypto_scalarmult_BYTES
	;

	/** Shared secret length. */
	public readonly secretBytes: number		= 64;

	/** Generates Alice's key pair. */
	public async aliceKeyPair () : Promise<{
		keyType: string;
		privateKey: Uint8Array;
		publicKey: Uint8Array;
	}> {
		const rlweKeyPair: {
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}	= lib.rlwe.aliceKeyPair();

		const sodiumPrivateKey: Uint8Array	= util.randomBytes(
			lib.sodium.crypto_scalarmult_SCALARBYTES
		);

		const sodiumPublicKey: Uint8Array	=
			lib.sodium.crypto_scalarmult_base(sodiumPrivateKey)
		;

		return {
			keyType: 'potassium-ephemeral',
			privateKey: util.concatMemory(
				true,
				rlweKeyPair.privateKey,
				sodiumPrivateKey
			),
			publicKey: util.concatMemory(
				true,
				rlweKeyPair.publicKey,
				sodiumPublicKey
			)
		};
	}

	/** Computes secret for Alice using Bob's public key. */
	public async aliceSecret (
		publicKey: Uint8Array,
		privateKey: Uint8Array
	) : Promise<Uint8Array> {
		const rlwePublicKey		= new Uint8Array(
			publicKey.buffer,
			publicKey.byteOffset,
			lib.rlwe.publicKeyLength
		);
		const sodiumPublicKey	= new Uint8Array(
			publicKey.buffer,
			publicKey.byteOffset + lib.rlwe.publicKeyLength,
			lib.sodium.crypto_scalarmult_BYTES
		);

		const rlwePrivateKey	= new Uint8Array(
			privateKey.buffer,
			privateKey.byteOffset,
			lib.rlwe.privateKeyLength
		);
		const sodiumPrivateKey	= new Uint8Array(
			privateKey.buffer,
			privateKey.byteOffset + lib.rlwe.privateKeyLength,
			lib.sodium.crypto_scalarmult_SCALARBYTES
		);

		const rlweSecret: Uint8Array	= lib.rlwe.aliceSecret(
			rlwePublicKey,
			rlwePrivateKey
		);

		const sodiumSecret: Uint8Array	= lib.sodium.crypto_scalarmult(
			sodiumPrivateKey,
			sodiumPublicKey
		);

		return this.hash.deriveKey(
			util.concatMemory(
				true,
				rlweSecret,
				sodiumSecret
			),
			this.secretBytes,
			true
		);
	}

	/** Computes secret and public key for Bob using Alice's public key. */
	public async bobSecret (alicePublicKey: Uint8Array) : Promise<{
		publicKey: Uint8Array;
		secret: Uint8Array;
	}> {
		const aliceRlwePublicKey	= new Uint8Array(
			alicePublicKey.buffer,
			alicePublicKey.byteOffset,
			lib.rlwe.publicKeyLength
		);
		const aliceSodiumPublicKey	= new Uint8Array(
			alicePublicKey.buffer,
			alicePublicKey.byteOffset + lib.rlwe.publicKeyLength,
			lib.sodium.crypto_scalarmult_BYTES
		);

		const rlweSecretData: {
			publicKey: Uint8Array;
			secret: Uint8Array;
		}	= lib.rlwe.bobSecret(aliceRlwePublicKey);

		const sodiumPrivateKey: Uint8Array	= util.randomBytes(
			lib.sodium.crypto_scalarmult_SCALARBYTES
		);
		const sodiumPublicKey: Uint8Array	=
			lib.sodium.crypto_scalarmult_base(sodiumPrivateKey)
		;
		const sodiumSecret: Uint8Array		= lib.sodium.crypto_scalarmult(
			sodiumPrivateKey,
			aliceSodiumPublicKey
		);

		util.clearMemory(sodiumPrivateKey);

		return {
			publicKey: util.concatMemory(
				true,
				rlweSecretData.publicKey,
				sodiumPublicKey
			),
			secret: await this.hash.deriveKey(
				util.concatMemory(
					true,
					rlweSecretData.secret,
					sodiumSecret
				),
				this.secretBytes,
				true
			)
		};
	}

	constructor (
		/** @ignore */
		private readonly hash: Hash
	) {}
}
