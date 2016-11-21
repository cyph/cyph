import {Hash} from './hash';
import {Lib} from './lib';
import {Util} from './util';


/** Equivalent to sodium.crypto_scalarmult. */
export class EphemeralKeyExchange {
	/** Private key length. */
	public privateKeyBytes: number	=
		Lib.rlwe.privateKeyLength +
		Lib.sodium.crypto_scalarmult_SCALARBYTES
	;

	/** Public key length. */
	public publicKeyBytes: number	=
		Lib.rlwe.publicKeyLength +
		Lib.sodium.crypto_scalarmult_BYTES
	;

	/** Shared secret length. */
	public secretBytes: number		= 64;

	/** Generates Alice's key pair. */
	public async aliceKeyPair () : Promise<{
		keyType: string;
		privateKey: Uint8Array;
		publicKey: Uint8Array;
	}> {
		const rlweKeyPair: {
			publicKey: Uint8Array;
			privateKey: Uint8Array;
		}	= Lib.rlwe.aliceKeyPair();

		const sodiumPrivateKey: Uint8Array	= Util.randomBytes(
			Lib.sodium.crypto_scalarmult_SCALARBYTES
		);

		const sodiumPublicKey: Uint8Array	=
			Lib.sodium.crypto_scalarmult_base(sodiumPrivateKey)
		;

		return {
			keyType: 'potassium-ephemeral',
			privateKey: Util.concatMemory(
				true,
				rlweKeyPair.privateKey,
				sodiumPrivateKey
			),
			publicKey: Util.concatMemory(
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
			Lib.rlwe.publicKeyLength
		);
		const sodiumPublicKey	= new Uint8Array(
			publicKey.buffer,
			publicKey.byteOffset + Lib.rlwe.publicKeyLength,
			Lib.sodium.crypto_scalarmult_BYTES
		);

		const rlwePrivateKey	= new Uint8Array(
			privateKey.buffer,
			privateKey.byteOffset,
			Lib.rlwe.privateKeyLength
		);
		const sodiumPrivateKey	= new Uint8Array(
			privateKey.buffer,
			privateKey.byteOffset + Lib.rlwe.privateKeyLength,
			Lib.sodium.crypto_scalarmult_SCALARBYTES
		);

		const rlweSecret: Uint8Array	= Lib.rlwe.aliceSecret(
			rlwePublicKey,
			rlwePrivateKey
		);

		const sodiumSecret: Uint8Array	= Lib.sodium.crypto_scalarmult(
			sodiumPrivateKey,
			sodiumPublicKey
		);

		return this.hash.deriveKey(
			Util.concatMemory(
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
			Lib.rlwe.publicKeyLength
		);
		const aliceSodiumPublicKey	= new Uint8Array(
			alicePublicKey.buffer,
			alicePublicKey.byteOffset + Lib.rlwe.publicKeyLength,
			Lib.sodium.crypto_scalarmult_BYTES
		);

		const rlweSecretData: {
			publicKey: Uint8Array;
			secret: Uint8Array;
		}	= Lib.rlwe.bobSecret(aliceRlwePublicKey);

		const sodiumPrivateKey: Uint8Array	= Util.randomBytes(
			Lib.sodium.crypto_scalarmult_SCALARBYTES
		);
		const sodiumPublicKey: Uint8Array	=
			Lib.sodium.crypto_scalarmult_base(sodiumPrivateKey)
		;
		const sodiumSecret: Uint8Array		= Lib.sodium.crypto_scalarmult(
			sodiumPrivateKey,
			aliceSodiumPublicKey
		);

		Util.clearMemory(sodiumPrivateKey);

		return {
			publicKey: Util.concatMemory(
				true,
				rlweSecretData.publicKey,
				sodiumPublicKey
			),
			secret: await this.hash.deriveKey(
				Util.concatMemory(
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
		private hash: Hash
	) {}
}
