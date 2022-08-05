import {kyber} from 'kyber-crystals';
import {sodium} from 'libsodium';
import memoize from 'lodash-es/memoize';
import {IRLWE, rlwe} from 'rlwe';
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
	private readonly algorithmPriorityOrderInternal = [
		PotassiumData.EphemeralKeyExchangeAlgorithms.V2,
		PotassiumData.EphemeralKeyExchangeAlgorithms.V1
	];

	/** @ignore */
	private readonly currentAlgorithmInternal =
		PotassiumData.EphemeralKeyExchangeAlgorithms.V2;

	/** @ignore */
	private readonly defaultMetadataInternal: IPotassiumData & {
		ephemeralKeyExchangeAlgorithm: PotassiumData.EphemeralKeyExchangeAlgorithms;
	} = {
		ephemeralKeyExchangeAlgorithm:
			PotassiumData.EphemeralKeyExchangeAlgorithms.V1
	};

	/** @ignore */
	private readonly helpers: Record<
		| PotassiumData.EphemeralKeyExchangeAlgorithms.V1
		| PotassiumData.EphemeralKeyExchangeAlgorithms.V2,
		IRLWE
	> = {
		[PotassiumData.EphemeralKeyExchangeAlgorithms.V1]: rlwe,
		[PotassiumData.EphemeralKeyExchangeAlgorithms.V2]: {
			aliceKeyPair: async () => kyber.keyPair(),
			aliceSecret: async (bobPublicKey, alicePrivateKey) =>
				kyber.decrypt(bobPublicKey, alicePrivateKey),
			bobSecret: async alicePublicKey => {
				const {cyphertext, secret} = await kyber.encrypt(
					alicePublicKey
				);
				/* kyber.cyphertextBytes === kyber.publicKeyBytes */
				return {publicKey: cyphertext, secret};
			},
			bytes: kyber.bytes,
			privateKeyBytes: kyber.privateKeyBytes,
			publicKeyBytes: kyber.publicKeyBytes
		}
	};

	/** @inheritDoc */
	public readonly algorithmPriorityOrder = Promise.resolve(
		this.algorithmPriorityOrderInternal
	);

	/** @inheritDoc */
	public readonly currentAlgorithm = Promise.resolve(
		this.currentAlgorithmInternal
	);

	/** @inheritDoc */
	public readonly defaultMetadata = Promise.resolve(
		this.defaultMetadataInternal
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
				case PotassiumData.EphemeralKeyExchangeAlgorithms.V2:
					const kex = this.helpers[algorithm];

					return (
						(await kex.privateKeyBytes) +
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
				case PotassiumData.EphemeralKeyExchangeAlgorithms.V2:
					const kex = this.helpers[algorithm];

					return (
						(await kex.publicKeyBytes) +
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
				case PotassiumData.EphemeralKeyExchangeAlgorithms.V2:
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
			case PotassiumData.EphemeralKeyExchangeAlgorithms.V2:
				const kex = this.helpers[algorithm];

				const kexKeyPair = await kex.aliceKeyPair();

				const sodiumPrivateKey = potassiumUtil.randomBytes(
					sodium.crypto_scalarmult_SCALARBYTES
				);

				const sodiumPublicKey =
					sodium.crypto_scalarmult_base(sodiumPrivateKey);

				result = {
					privateKey: potassiumUtil.concatMemory(
						true,
						kexKeyPair.privateKey,
						sodiumPrivateKey
					),
					publicKey: potassiumUtil.concatMemory(
						true,
						kexKeyPair.publicKey,
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
				potassiumEncoding.deserialize(this.defaultMetadataInternal, {
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
				potassiumEncoding.deserialize(this.defaultMetadataInternal, {
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
				this.algorithmPriorityOrderInternal.find(
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
			case PotassiumData.EphemeralKeyExchangeAlgorithms.V2:
				const kex = this.helpers[algorithm];

				const secretBytes = await this.getSecretBytes(algorithm);

				const kexPublicKey = potassiumUtil.toBytes(
					potassiumPublicKey.publicKey,
					0,
					await kex.publicKeyBytes
				);
				const sodiumPublicKey = potassiumUtil.toBytes(
					potassiumPublicKey.publicKey,
					await kex.publicKeyBytes,
					sodium.crypto_scalarmult_BYTES
				);

				const kexPrivateKey = potassiumUtil.toBytes(
					potassiumPrivateKey.privateKey,
					0,
					await kex.privateKeyBytes
				);
				const sodiumPrivateKey = potassiumUtil.toBytes(
					potassiumPrivateKey.privateKey,
					await kex.privateKeyBytes,
					sodium.crypto_scalarmult_SCALARBYTES
				);

				const kexSecret = await kex.aliceSecret(
					kexPublicKey,
					kexPrivateKey
				);

				const sodiumSecret = sodium.crypto_scalarmult(
					sodiumPrivateKey,
					sodiumPublicKey
				);

				result = await this.hash.deriveKey(
					potassiumUtil.concatMemory(true, kexSecret, sodiumSecret),
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
			this.algorithmPriorityOrderInternal
		);

		const potassiumAlicePublicKey = await potassiumEncoding.deserialize(
			this.defaultMetadataInternal,
			{publicKey: alicePublicKey}
		);

		const algorithm = potassiumAlicePublicKey.ephemeralKeyExchangeAlgorithm;

		let result: {
			publicKey: Uint8Array;
			secret: Uint8Array;
		};

		switch (algorithm) {
			case PotassiumData.EphemeralKeyExchangeAlgorithms.V1:
			case PotassiumData.EphemeralKeyExchangeAlgorithms.V2:
				const kex = this.helpers[algorithm];

				const secretBytes = await this.getSecretBytes(algorithm);

				const aliceRlwePublicKey = potassiumUtil.toBytes(
					potassiumAlicePublicKey.publicKey,
					0,
					await kex.publicKeyBytes
				);
				const aliceSodiumPublicKey = potassiumUtil.toBytes(
					potassiumAlicePublicKey.publicKey,
					await kex.publicKeyBytes,
					sodium.crypto_scalarmult_BYTES
				);

				const kexSecretData = await kex.bobSecret(aliceRlwePublicKey);

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
						kexSecretData.publicKey,
						sodiumPublicKey
					),
					secret: await this.hash.deriveKey(
						potassiumUtil.concatMemory(
							true,
							kexSecretData.secret,
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
