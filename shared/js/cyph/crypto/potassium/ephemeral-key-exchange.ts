import {sodium} from 'libsodium';
import memoize from 'lodash-es/memoize';
import {rlwe} from 'rlwe';
import {IKeyPair, IPotassiumData, PotassiumData} from '../../proto';
import {IEphemeralKeyExchange} from './iephemeral-key-exchange';
import {IHash} from './ihash';
import {potassiumEncoding} from './potassium-encoding';
import {potassiumUtil} from './potassium-util';

/** @inheritDoc */
export class EphemeralKeyExchange implements IEphemeralKeyExchange {
	/** @ignore */
	private readonly currentAlgorithmInternal =
		PotassiumData.EphemeralKeyExchangeAlgorithms.V1;

	/** @see PotassiumEncoding.deserialize */
	private readonly defaultMetadata: IPotassiumData & {
		ephemeralKeyExchangeAlgorithm: PotassiumData.EphemeralKeyExchangeAlgorithms;
	} = {
		ephemeralKeyExchangeAlgorithm:
			PotassiumData.EphemeralKeyExchangeAlgorithms.V1
	};

	/** @inheritDoc */
	public readonly currentAlgorithm = Promise.resolve(
		this.currentAlgorithmInternal
	);

	/** @inheritDoc */
	public readonly getPrivateKeyBytes = memoize(
		async (
			algorithm: PotassiumData.EphemeralKeyExchangeAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.EphemeralKeyExchangeAlgorithms.V1:
					return (
						(await rlwe.privateKeyBytes) +
						sodium.crypto_scalarmult_SCALARBYTES
					);

				default:
					throw new Error(
						'Invalid EphemeralKeyExchange algorithm (private key bytes).'
					);
			}
		}
	);

	/** @inheritDoc */
	public readonly getPublicKeyBytes = memoize(
		async (
			algorithm: PotassiumData.EphemeralKeyExchangeAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.EphemeralKeyExchangeAlgorithms.V1:
					return (
						(await rlwe.publicKeyBytes) +
						sodium.crypto_scalarmult_BYTES
					);

				default:
					throw new Error(
						'Invalid EphemeralKeyExchange algorithm (public key bytes).'
					);
			}
		}
	);

	/** @inheritDoc */
	public readonly getSecretBytes = memoize(
		async (
			algorithm: PotassiumData.EphemeralKeyExchangeAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			switch (algorithm) {
				case PotassiumData.EphemeralKeyExchangeAlgorithms.V1:
					return 64;

				default:
					throw new Error(
						'Invalid EphemeralKeyExchange algorithm (secret bytes).'
					);
			}
		}
	);

	/** @inheritDoc */
	public async aliceKeyPair (
		algorithm: PotassiumData.EphemeralKeyExchangeAlgorithms = this
			.currentAlgorithmInternal
	) : Promise<IKeyPair> {
		await sodium.ready;

		let result: IKeyPair;

		switch (algorithm) {
			case PotassiumData.EphemeralKeyExchangeAlgorithms.V1:
				const rlweKeyPair = await rlwe.aliceKeyPair();

				const sodiumPrivateKey = potassiumUtil.randomBytes(
					sodium.crypto_scalarmult_SCALARBYTES
				);

				const sodiumPublicKey =
					sodium.crypto_scalarmult_base(sodiumPrivateKey);

				result = {
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
				break;

			default:
				throw new Error(
					'Invalid EphemeralKeyExchange algorithm (Alice key pair).'
				);
		}

		return {
			privateKey: await potassiumEncoding.serialize({
				ephemeralKeyExchangeAlgorithm: algorithm,
				privateKey: result.privateKey
			}),
			publicKey: await potassiumEncoding.serialize({
				ephemeralKeyExchangeAlgorithm: algorithm,
				publicKey: result.publicKey
			})
		};
	}

	/** @inheritDoc */
	public async aliceSecret (
		publicKey: Uint8Array,
		privateKey: Uint8Array
	) : Promise<Uint8Array> {
		await sodium.ready;

		const potassiumPrivateKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{privateKey}
		);
		const potassiumPublicKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{publicKey}
		);

		const algorithm = potassiumPrivateKey.ephemeralKeyExchangeAlgorithm;

		if (potassiumPublicKey.ephemeralKeyExchangeAlgorithm !== algorithm) {
			throw new Error(
				'Public key - private key EphemeralKeyExchange algorithm mismatch (Alice secret).'
			);
		}

		let result: Uint8Array;

		switch (algorithm) {
			case PotassiumData.EphemeralKeyExchangeAlgorithms.V1:
				const secretBytes = await this.getSecretBytes(algorithm);

				const rlwePublicKey = potassiumUtil.toBytes(
					potassiumPublicKey.publicKey,
					0,
					await rlwe.publicKeyBytes
				);
				const sodiumPublicKey = potassiumUtil.toBytes(
					potassiumPublicKey.publicKey,
					await rlwe.publicKeyBytes,
					sodium.crypto_scalarmult_BYTES
				);

				const rlwePrivateKey = potassiumUtil.toBytes(
					potassiumPrivateKey.privateKey,
					0,
					await rlwe.privateKeyBytes
				);
				const sodiumPrivateKey = potassiumUtil.toBytes(
					potassiumPrivateKey.privateKey,
					await rlwe.privateKeyBytes,
					sodium.crypto_scalarmult_SCALARBYTES
				);

				const rlweSecret = await rlwe.aliceSecret(
					rlwePublicKey,
					rlwePrivateKey
				);

				const sodiumSecret = sodium.crypto_scalarmult(
					sodiumPrivateKey,
					sodiumPublicKey
				);

				result = await this.hash.deriveKey(
					potassiumUtil.concatMemory(true, rlweSecret, sodiumSecret),
					secretBytes,
					true
				);
				break;

			default:
				throw new Error(
					'Invalid EphemeralKeyExchange algorithm (Alice secret).'
				);
		}

		return potassiumEncoding.serialize({
			ephemeralKeyExchangeAlgorithm: algorithm,
			secret: result
		});
	}

	/** @inheritDoc */
	public async bobSecret (alicePublicKey: Uint8Array) : Promise<{
		publicKey: Uint8Array;
		secret: Uint8Array;
	}> {
		await sodium.ready;

		const potassiumAlicePublicKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{publicKey: alicePublicKey}
		);

		const algorithm = potassiumAlicePublicKey.ephemeralKeyExchangeAlgorithm;

		let result: {
			publicKey: Uint8Array;
			secret: Uint8Array;
		};

		switch (algorithm) {
			case PotassiumData.EphemeralKeyExchangeAlgorithms.V1:
				const secretBytes = await this.getSecretBytes(algorithm);

				const aliceRlwePublicKey = potassiumUtil.toBytes(
					alicePublicKey,
					0,
					await rlwe.publicKeyBytes
				);
				const aliceSodiumPublicKey = potassiumUtil.toBytes(
					alicePublicKey,
					await rlwe.publicKeyBytes,
					sodium.crypto_scalarmult_BYTES
				);

				const rlweSecretData = await rlwe.bobSecret(aliceRlwePublicKey);

				const sodiumPrivateKey = potassiumUtil.randomBytes(
					sodium.crypto_scalarmult_SCALARBYTES
				);
				const sodiumPublicKey =
					sodium.crypto_scalarmult_base(sodiumPrivateKey);
				const sodiumSecret = sodium.crypto_scalarmult(
					sodiumPrivateKey,
					aliceSodiumPublicKey
				);

				potassiumUtil.clearMemory(sodiumPrivateKey);

				result = {
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
				break;

			default:
				throw new Error(
					'Invalid EphemeralKeyExchange algorithm (Bob secret).'
				);
		}

		return {
			publicKey: await potassiumEncoding.serialize({
				ephemeralKeyExchangeAlgorithm: algorithm,
				publicKey: result.publicKey
			}),
			secret: await potassiumEncoding.serialize({
				ephemeralKeyExchangeAlgorithm: algorithm,
				secret: result.secret
			})
		};
	}

	constructor (
		/** @ignore */
		private readonly hash: IHash
	) {}
}
