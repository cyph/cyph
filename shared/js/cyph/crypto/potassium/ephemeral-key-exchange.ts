import {sodium} from 'libsodium';
import memoize from 'lodash-es/memoize';
import {rlwe} from 'rlwe';
import {
	IKeyPair,
	IPotassiumData,
	IPrivateKeyring,
	IPublicKeyring,
	PotassiumData
} from '../../../proto';
import {IEphemeralKeyExchange} from './iephemeral-key-exchange';
import {IHash} from './ihash';
import {potassiumEncoding} from './potassium-encoding';
import {potassiumUtil} from './potassium-util';

/** @inheritDoc */
export class EphemeralKeyExchange implements IEphemeralKeyExchange {
	/** @ignore */
	private readonly algorithmPriorityOrder = [
		PotassiumData.EphemeralKeyExchangeAlgorithms.V1
	];

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
		publicKey: Uint8Array | IPublicKeyring,
		privateKey: Uint8Array | IPrivateKeyring,
		rawOutput: boolean = false
	) : Promise<Uint8Array> {
		await sodium.ready;

		const deserializePotassiumPrivateKey = memoize(
			async (privateKeyBytes: Uint8Array) =>
				potassiumEncoding.deserialize(this.defaultMetadata, {
					privateKey: privateKeyBytes
				})
		);
		const getPotassiumPrivateKey = memoize(
			async (algorithm: PotassiumData.EphemeralKeyExchangeAlgorithms) =>
				deserializePotassiumPrivateKey(
					privateKey instanceof Uint8Array ?
						privateKey :
						potassiumEncoding.openKeyring(
							PotassiumData.EphemeralKeyExchangeAlgorithms,
							privateKey,
							algorithm
						).privateKey
				)
		);

		const deserializePotassiumPublicKey = memoize(
			async (publicKeyBytes: Uint8Array) =>
				potassiumEncoding.deserialize(this.defaultMetadata, {
					publicKey: publicKeyBytes
				})
		);
		const getPotassiumPublicKey = memoize(
			async (algorithm: PotassiumData.EphemeralKeyExchangeAlgorithms) =>
				deserializePotassiumPublicKey(
					potassiumEncoding.openKeyring(
						PotassiumData.EphemeralKeyExchangeAlgorithms,
						publicKey,
						algorithm
					)
				)
		);

		const algorithm =
			publicKey instanceof Uint8Array ?
				(await deserializePotassiumPublicKey(publicKey))
					.ephemeralKeyExchangeAlgorithm :
			privateKey instanceof Uint8Array ?
				(await deserializePotassiumPrivateKey(privateKey))
					.ephemeralKeyExchangeAlgorithm :
				this.algorithmPriorityOrder.find(
					alg =>
						privateKey.ephemeralKeyExchangePrivateKeys?.[alg] !==
							undefined &&
						publicKey.ephemeralKeyExchangePublicKeys?.[alg] !==
							undefined
				);

		if (algorithm === undefined) {
			throw new Error(
				'Failed to negotiate EphemeralKeyExchange algorithm (Alice secret).'
			);
		}

		const potassiumPrivateKey = await getPotassiumPrivateKey(algorithm);
		const potassiumPublicKey = await getPotassiumPublicKey(algorithm);

		if (
			potassiumPrivateKey.ephemeralKeyExchangeAlgorithm !== algorithm ||
			potassiumPublicKey.ephemeralKeyExchangeAlgorithm !== algorithm
		) {
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

		if (rawOutput) {
			return result;
		}

		return potassiumEncoding.serialize({
			ephemeralKeyExchangeAlgorithm: algorithm,
			secret: result
		});
	}

	/** @inheritDoc */
	public async bobSecret (
		alicePublicKey: Uint8Array | IPublicKeyring,
		rawOutput: boolean = false
	) : Promise<{
		publicKey: Uint8Array;
		secret: Uint8Array;
	}> {
		await sodium.ready;

		alicePublicKey = potassiumEncoding.openKeyring(
			PotassiumData.EphemeralKeyExchangeAlgorithms,
			alicePublicKey,
			this.currentAlgorithmInternal
		);

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
					potassiumAlicePublicKey.publicKey,
					0,
					await rlwe.publicKeyBytes
				);
				const aliceSodiumPublicKey = potassiumUtil.toBytes(
					potassiumAlicePublicKey.publicKey,
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
			secret: rawOutput ?
				result.secret :
				await potassiumEncoding.serialize({
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
