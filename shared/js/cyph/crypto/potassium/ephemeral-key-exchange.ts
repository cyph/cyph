import {sodium} from 'libsodium';
import {rlwe} from 'rlwe';
import {IKeyPair} from '../../proto';
import {IEphemeralKeyExchange} from './iephemeral-key-exchange';
import {IHash} from './ihash';
import {potassiumUtil} from './potassium-util';


/** @inheritDoc */
export class EphemeralKeyExchange implements IEphemeralKeyExchange {
	/** @inheritDoc */
	public readonly privateKeyBytes: Promise<number>	= sodium.ready.then(async () =>
		(await rlwe.privateKeyBytes) +
		sodium.crypto_scalarmult_SCALARBYTES
	);

	/** @inheritDoc */
	public readonly publicKeyBytes: Promise<number>		= sodium.ready.then(async () =>
		(await rlwe.publicKeyBytes) +
		sodium.crypto_scalarmult_BYTES
	);

	/** @inheritDoc */
	public readonly secretBytes: Promise<number>		= Promise.resolve(64);

	/** @inheritDoc */
	public async aliceKeyPair () : Promise<IKeyPair> {
		await sodium.ready;

		const rlweKeyPair		= await rlwe.aliceKeyPair();

		const sodiumPrivateKey	= potassiumUtil.randomBytes(
			sodium.crypto_scalarmult_SCALARBYTES
		);

		const sodiumPublicKey	=
			sodium.crypto_scalarmult_base(sodiumPrivateKey)
		;

		return {
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

	/** @inheritDoc */
	public async aliceSecret (
		publicKey: Uint8Array,
		privateKey: Uint8Array
	) : Promise<Uint8Array> {
		await sodium.ready;

		const secretBytes	= await this.secretBytes;

		const rlwePublicKey		= potassiumUtil.toBytes(
			publicKey,
			0,
			await rlwe.publicKeyBytes
		);
		const sodiumPublicKey	= potassiumUtil.toBytes(
			publicKey,
			await rlwe.publicKeyBytes,
			sodium.crypto_scalarmult_BYTES
		);

		const rlwePrivateKey	= potassiumUtil.toBytes(
			privateKey,
			0,
			await rlwe.privateKeyBytes
		);
		const sodiumPrivateKey	= potassiumUtil.toBytes(
			privateKey,
			await rlwe.privateKeyBytes,
			sodium.crypto_scalarmult_SCALARBYTES
		);

		const rlweSecret		= await rlwe.aliceSecret(
			rlwePublicKey,
			rlwePrivateKey
		);

		const sodiumSecret		= sodium.crypto_scalarmult(
			sodiumPrivateKey,
			sodiumPublicKey
		);

		return this.hash.deriveKey(
			potassiumUtil.concatMemory(
				true,
				rlweSecret,
				sodiumSecret
			),
			secretBytes,
			true
		);
	}

	/** @inheritDoc */
	public async bobSecret (alicePublicKey: Uint8Array) : Promise<{
		publicKey: Uint8Array;
		secret: Uint8Array;
	}> {
		await sodium.ready;

		const secretBytes	= await this.secretBytes;

		const aliceRlwePublicKey	= potassiumUtil.toBytes(
			alicePublicKey,
			0,
			await rlwe.publicKeyBytes
		);
		const aliceSodiumPublicKey	= potassiumUtil.toBytes(
			alicePublicKey,
			await rlwe.publicKeyBytes,
			sodium.crypto_scalarmult_BYTES
		);

		const rlweSecretData		= await rlwe.bobSecret(aliceRlwePublicKey);

		const sodiumPrivateKey		= potassiumUtil.randomBytes(
			sodium.crypto_scalarmult_SCALARBYTES
		);
		const sodiumPublicKey		=
			sodium.crypto_scalarmult_base(sodiumPrivateKey)
		;
		const sodiumSecret			= sodium.crypto_scalarmult(
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
				secretBytes,
				true
			)
		};
	}

	constructor (
		/** @ignore */
		private readonly hash: IHash
	) {}
}
