import {IKeyPair} from '../ikey-pair';
import {Hash} from './hash';
import {potassiumUtil} from './potassium-util';


/** Equivalent to sodium.crypto_scalarmult. */
export class EphemeralKeyExchange {
	/** Private key length. */
	public readonly privateKeyBytes: number	=
		rlwe.privateKeyBytes +
		sodium.crypto_scalarmult_SCALARBYTES
	;

	/** Public key length. */
	public readonly publicKeyBytes: number	=
		rlwe.publicKeyBytes +
		sodium.crypto_scalarmult_BYTES
	;

	/** Shared secret length. */
	public readonly secretBytes: number		= 64;

	/** Generates Alice's key pair. */
	public async aliceKeyPair () : Promise<IKeyPair> {
		const rlweKeyPair: IKeyPair	= rlwe.aliceKeyPair();

		const sodiumPrivateKey: Uint8Array	= potassiumUtil.randomBytes(
			sodium.crypto_scalarmult_SCALARBYTES
		);

		const sodiumPublicKey: Uint8Array	=
			sodium.crypto_scalarmult_base(sodiumPrivateKey)
		;

		return {
			keyType: 'potassium-ephemeral',
			privateKey: potassiumUtil.concatMemory(
				true,
				rlweKeyPair.privateKey,
				sodiumPrivateKey
			),
			publicKey: potassiumUtil.concatMemory(
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
			rlwe.publicKeyBytes
		);
		const sodiumPublicKey	= new Uint8Array(
			publicKey.buffer,
			publicKey.byteOffset + rlwe.publicKeyBytes,
			sodium.crypto_scalarmult_BYTES
		);

		const rlwePrivateKey	= new Uint8Array(
			privateKey.buffer,
			privateKey.byteOffset,
			rlwe.privateKeyBytes
		);
		const sodiumPrivateKey	= new Uint8Array(
			privateKey.buffer,
			privateKey.byteOffset + rlwe.privateKeyBytes,
			sodium.crypto_scalarmult_SCALARBYTES
		);

		const rlweSecret: Uint8Array	= rlwe.aliceSecret(
			rlwePublicKey,
			rlwePrivateKey
		);

		const sodiumSecret: Uint8Array	= sodium.crypto_scalarmult(
			sodiumPrivateKey,
			sodiumPublicKey
		);

		return this.hash.deriveKey(
			potassiumUtil.concatMemory(
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
			rlwe.publicKeyBytes
		);
		const aliceSodiumPublicKey	= new Uint8Array(
			alicePublicKey.buffer,
			alicePublicKey.byteOffset + rlwe.publicKeyBytes,
			sodium.crypto_scalarmult_BYTES
		);

		const rlweSecretData: {
			publicKey: Uint8Array;
			secret: Uint8Array;
		}	= rlwe.bobSecret(aliceRlwePublicKey);

		const sodiumPrivateKey: Uint8Array	= potassiumUtil.randomBytes(
			sodium.crypto_scalarmult_SCALARBYTES
		);
		const sodiumPublicKey: Uint8Array	=
			sodium.crypto_scalarmult_base(sodiumPrivateKey)
		;
		const sodiumSecret: Uint8Array		= sodium.crypto_scalarmult(
			sodiumPrivateKey,
			aliceSodiumPublicKey
		);

		potassiumUtil.clearMemory(sodiumPrivateKey);

		return {
			publicKey: potassiumUtil.concatMemory(
				true,
				rlweSecretData.publicKey,
				sodiumPublicKey
			),
			secret: await this.hash.deriveKey(
				potassiumUtil.concatMemory(
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
