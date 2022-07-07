/* eslint-disable max-lines */

import {sodium} from 'libsodium';
import memoize from 'lodash-es/memoize';
import {mceliece} from 'mceliece';
import {ntru} from 'ntru';
import {sidh} from 'sidh';
import {
	IKeyPair,
	IPotassiumData,
	IPrivateKeyring,
	IPublicKeyring,
	PotassiumData
} from '../../proto';
import {errorToString} from '../../util/error';
import {debugLog} from '../../util/log';
import {retryUntilSuccessful} from '../../util/wait/retry-until-successful';
import {IBox} from './ibox';
import {IOneTimeAuth} from './ione-time-auth';
import {ISecretBox} from './isecret-box';
import * as NativeCrypto from './native-crypto';
import {potassiumEncoding} from './potassium-encoding';
import {potassiumUtil} from './potassium-util';

/** @inheritDoc */
export class Box implements IBox {
	/** @ignore */
	private readonly currentAlgorithmInternal = !this.isNative ?
		PotassiumData.BoxAlgorithms.V1 :
		PotassiumData.BoxAlgorithms.NativeV1;

	/** @see PotassiumEncoding.deserialize */
	private readonly defaultMetadata: IPotassiumData & {
		boxAlgorithm: PotassiumData.BoxAlgorithms;
	} = {
		boxAlgorithm: PotassiumData.BoxAlgorithms.V1
	};

	/** @ignore */
	private readonly v1ClassicalCypher = memoize(
		(
			algorithm:
				| PotassiumData.BoxAlgorithms.NativeV1
				| PotassiumData.BoxAlgorithms.V1
		) => ({
			decrypt:
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ?
					async (cyphertext: Uint8Array, keyPair: IKeyPair) =>
						NativeCrypto.box.open(cyphertext, keyPair) :
					async (cyphertext: Uint8Array, keyPair: IKeyPair) =>
						sodium.ready.then(() =>
							sodium.crypto_box_curve25519xchacha20poly1305_seal_open(
								cyphertext,
								keyPair.publicKey,
								keyPair.privateKey
							)
						),
			encrypt:
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ?
					async (plaintext: Uint8Array, publicKey: Uint8Array) =>
						NativeCrypto.box.seal(plaintext, publicKey) :
					async (plaintext: Uint8Array, publicKey: Uint8Array) =>
						sodium.ready.then(() =>
							sodium.crypto_box_curve25519xchacha20poly1305_seal(
								plaintext,
								publicKey
							)
						),
			keyPair:
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ?
					async () => NativeCrypto.box.keyPair() :
					async () =>
						sodium.ready.then(() =>
							sodium.crypto_box_curve25519xchacha20poly1305_keypair()
						),
			nonceBytes: sodium.ready.then(() =>
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ?
					NativeCrypto.secretBox.nonceBytes :
					sodium.crypto_box_curve25519xchacha20poly1305_NONCEBYTES
			),
			privateKeyBytes: sodium.ready.then(() =>
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ?
					NativeCrypto.box.privateKeyBytes :
					sodium.crypto_box_curve25519xchacha20poly1305_SECRETKEYBYTES
			),
			publicKeyBytes: sodium.ready.then(() =>
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ?
					NativeCrypto.box.publicKeyBytes :
					sodium.crypto_box_curve25519xchacha20poly1305_PUBLICKEYBYTES
			)
		})
	);

	/** @inheritDoc */
	public readonly currentAlgorithm = Promise.resolve(
		this.currentAlgorithmInternal
	);

	/** @inheritDoc */
	public readonly getPrivateKeyBytes = memoize(
		async (
			algorithm: PotassiumData.BoxAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.BoxAlgorithms.NativeV1:
				case PotassiumData.BoxAlgorithms.V1:
					return (
						(await mceliece.privateKeyBytes) +
						(await ntru.privateKeyBytes) +
						(await sidh.privateKeyBytes) +
						(await this.v1ClassicalCypher(algorithm)
							.privateKeyBytes)
					);

				default:
					throw new Error(
						'Invalid Box algorithm (private key bytes).'
					);
			}
		}
	);

	/** @inheritDoc */
	public readonly getPublicKeyBytes = memoize(
		async (
			algorithm: PotassiumData.BoxAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.BoxAlgorithms.NativeV1:
				case PotassiumData.BoxAlgorithms.V1:
					return (
						(await mceliece.privateKeyBytes) +
						(await ntru.privateKeyBytes) +
						(await sidh.privateKeyBytes) +
						(await this.v1ClassicalCypher(algorithm).publicKeyBytes)
					);

				default:
					throw new Error(
						'Invalid Box algorithm (public key bytes).'
					);
			}
		}
	);

	/** @ignore */
	private async v1PublicKeyDecrypt<SK extends IKeyPair | Uint8Array> (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV1
			| PotassiumData.BoxAlgorithms.V1,
		cyphertext: Uint8Array,
		privateKey: SK,
		cypher: {
			decrypt: (
				cyphertext: Uint8Array,
				keyPair: SK
			) => Promise<Uint8Array>;
		},
		name: string,
		clearCyphertext: boolean = true
	) : Promise<Uint8Array> {
		const oneTimeAuthAlgorithm =
			algorithm === PotassiumData.BoxAlgorithms.NativeV1 ?
				PotassiumData.OneTimeAuthAlgorithms.NativeV1 :
				PotassiumData.OneTimeAuthAlgorithms.V1;

		const oneTimeAuthBytes = await this.oneTimeAuth.getBytes(
			oneTimeAuthAlgorithm
		);
		const oneTimeAuthKeyBytes = await this.oneTimeAuth.getKeyBytes(
			oneTimeAuthAlgorithm
		);

		try {
			const [asymmetricCyphertext, symmetricCyphertext] =
				potassiumUtil.splitBytes(cyphertext);

			const mac = potassiumUtil.toBytes(
				asymmetricCyphertext,
				0,
				oneTimeAuthBytes
			);
			const encrypted = potassiumUtil.toBytes(
				asymmetricCyphertext,
				oneTimeAuthBytes
			);
			const decrypted = await cypher.decrypt(encrypted, privateKey);
			const authKey = potassiumUtil.toBytes(
				decrypted,
				0,
				oneTimeAuthKeyBytes
			);
			const symmetricKey = potassiumUtil.toBytes(
				decrypted,
				oneTimeAuthKeyBytes
			);
			const isValid = await this.oneTimeAuth.verify(
				mac,
				encrypted,
				authKey
			);

			try {
				if (!isValid) {
					throw new Error(`${name} auth validation failed.`);
				}

				return await this.secretBox.open(
					symmetricCyphertext,
					symmetricKey
				);
			}
			finally {
				potassiumUtil.clearMemory(decrypted);
			}
		}
		catch (err) {
			throw new Error(`${name} decryption error: ${errorToString(err)}`);
		}
		finally {
			if (clearCyphertext) {
				potassiumUtil.clearMemory(cyphertext);
			}
		}
	}

	/** @ignore */
	private async v1PublicKeyEncrypt (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV1
			| PotassiumData.BoxAlgorithms.V1,
		plaintext: Uint8Array,
		publicKey: Uint8Array,
		cypher: {
			encrypt: (
				plaintext: Uint8Array,
				publicKey: Uint8Array
			) => Promise<Uint8Array>;
		},
		name: string,
		clearPlaintext: boolean = true
	) : Promise<Uint8Array> {
		const oneTimeAuthAlgorithm =
			algorithm === PotassiumData.BoxAlgorithms.NativeV1 ?
				PotassiumData.OneTimeAuthAlgorithms.NativeV1 :
				PotassiumData.OneTimeAuthAlgorithms.V1;
		const secretBoxAlgorithm =
			algorithm === PotassiumData.BoxAlgorithms.NativeV1 ?
				PotassiumData.SecretBoxAlgorithms.NativeV1 :
				PotassiumData.SecretBoxAlgorithms.V1;

		const oneTimeAuthKeyBytes = await this.oneTimeAuth.getKeyBytes(
			oneTimeAuthAlgorithm
		);
		const secretBoxKeyBytes = await this.secretBox.getKeyBytes(
			secretBoxAlgorithm
		);

		try {
			const asymmetricPlaintext = potassiumUtil.randomBytes(
				oneTimeAuthKeyBytes + secretBoxKeyBytes
			);

			const symmetricKey = potassiumUtil.toBytes(
				asymmetricPlaintext,
				oneTimeAuthKeyBytes
			);
			const symmetricCyphertext = await this.secretBox.seal(
				plaintext,
				symmetricKey
			);

			const authKey = potassiumUtil.toBytes(
				asymmetricPlaintext,
				0,
				oneTimeAuthKeyBytes
			);
			const encrypted = await cypher.encrypt(
				asymmetricPlaintext,
				publicKey
			);
			const mac = await this.oneTimeAuth.sign(encrypted, authKey);
			const asymmetricCyphertext = potassiumUtil.concatMemory(
				true,
				mac,
				encrypted
			);

			potassiumUtil.clearMemory(asymmetricPlaintext);

			return potassiumUtil.joinBytes(
				asymmetricCyphertext,
				symmetricCyphertext
			);
		}
		catch (err) {
			throw new Error(`${name} encryption error: ${errorToString(err)}`);
		}
		finally {
			if (clearPlaintext) {
				potassiumUtil.clearMemory(plaintext);
			}
		}
	}

	/** @ignore */
	private async v1SplitPrivateKey (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV1
			| PotassiumData.BoxAlgorithms.V1,
		privateKey: Uint8Array
	) : Promise<{
		classical: Uint8Array;
		mceliece: Uint8Array;
		ntru: Uint8Array;
		sidh: Uint8Array;
	}> {
		const classicalCypher = this.v1ClassicalCypher(algorithm);

		return {
			classical: potassiumUtil.toBytes(
				privateKey,
				0,
				await classicalCypher.privateKeyBytes
			),
			mceliece: potassiumUtil.toBytes(
				privateKey,
				await classicalCypher.privateKeyBytes,
				await mceliece.privateKeyBytes
			),
			ntru: potassiumUtil.toBytes(
				privateKey,
				(await classicalCypher.privateKeyBytes) +
					(await mceliece.privateKeyBytes),
				await ntru.privateKeyBytes
			),
			sidh: potassiumUtil.toBytes(
				privateKey,
				(await classicalCypher.privateKeyBytes) +
					(await mceliece.privateKeyBytes) +
					(await ntru.privateKeyBytes),
				await sidh.privateKeyBytes
			)
		};
	}

	/** @ignore */
	private async v1SplitPublicKey (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV1
			| PotassiumData.BoxAlgorithms.V1,
		publicKey: Uint8Array
	) : Promise<{
		classical: Uint8Array;
		mceliece: Uint8Array;
		ntru: Uint8Array;
		sidh: Uint8Array;
	}> {
		const classicalCypher = this.v1ClassicalCypher(algorithm);

		const [
			classicalCypherPublicKeyBytes,
			mceliecePublicKeyBytes,
			ntruPublicKeyBytes,
			sidhPublicKeyBytes
		] = await Promise.all([
			classicalCypher.publicKeyBytes,
			mceliece.publicKeyBytes,
			ntru.publicKeyBytes,
			sidh.publicKeyBytes
		]);

		const logProgress = async (
			publicKeys?: () => Record<string, Uint8Array>
		) =>
			debugLog(() => ({
				splitPublicKey: {
					byteLengths: {
						classicalCypherPublicKeyBytes,
						mceliecePublicKeyBytes,
						ntruPublicKeyBytes,
						sidhPublicKeyBytes
					},
					publicKeys: publicKeys ? publicKeys() : undefined
				}
			})).catch(() => {});

		logProgress();

		const classicalKey = potassiumUtil.toBytes(
			publicKey,
			0,
			classicalCypherPublicKeyBytes
		);

		logProgress(() => ({
			classicalKey
		}));

		const mcelieceKey = potassiumUtil.toBytes(
			publicKey,
			classicalCypherPublicKeyBytes,
			mceliecePublicKeyBytes
		);

		logProgress(() => ({
			classicalKey,
			mcelieceKey
		}));

		const ntruKey = potassiumUtil.toBytes(
			publicKey,
			classicalCypherPublicKeyBytes + mceliecePublicKeyBytes,
			ntruPublicKeyBytes
		);

		logProgress(() => ({
			classicalKey,
			mcelieceKey,
			ntruKey
		}));

		const sidhKey = potassiumUtil.toBytes(
			publicKey,
			classicalCypherPublicKeyBytes +
				mceliecePublicKeyBytes +
				ntruPublicKeyBytes,
			sidhPublicKeyBytes
		);

		logProgress(() => ({
			classicalKey,
			mcelieceKey,
			ntruKey,
			sidhKey
		}));

		return {
			classical: classicalKey,
			mceliece: mcelieceKey,
			ntru: ntruKey,
			sidh: sidhKey
		};
	}

	/** @inheritDoc */
	public async keyPair (
		algorithm: PotassiumData.BoxAlgorithms = this.currentAlgorithmInternal
	) : Promise<IKeyPair> {
		await sodium.ready;

		return retryUntilSuccessful(async () => {
			let result: IKeyPair;

			switch (algorithm) {
				case PotassiumData.BoxAlgorithms.NativeV1:
				case PotassiumData.BoxAlgorithms.V1:
					const [
						classicalKeyPair,
						mcelieceKeyPair,
						ntruKeyPair,
						sidhKeyPair
					] = await Promise.all([
						this.v1ClassicalCypher(algorithm).keyPair(),
						mceliece.keyPair(),
						ntru.keyPair(),
						sidh.keyPair()
					]);

					result = {
						privateKey: potassiumUtil.concatMemory(
							true,
							classicalKeyPair.privateKey,
							mcelieceKeyPair.privateKey,
							ntruKeyPair.privateKey,
							sidhKeyPair.privateKey
						),
						publicKey: potassiumUtil.concatMemory(
							true,
							classicalKeyPair.publicKey,
							mcelieceKeyPair.publicKey,
							ntruKeyPair.publicKey,
							sidhKeyPair.publicKey
						)
					};
					break;

				default:
					throw new Error('Invalid Box algorithm (key pair).');
			}

			const testInput = potassiumUtil.randomBytes(32);
			if (
				!potassiumUtil.compareMemory(
					testInput,
					await this.open(
						await this.seal(testInput, result.publicKey),
						result
					)
				)
			) {
				throw new Error('Corrupt Potassium.Box key.');
			}

			return {
				privateKey: await potassiumEncoding.serialize({
					boxAlgorithm: algorithm,
					privateKey: result.privateKey
				}),
				publicKey: await potassiumEncoding.serialize({
					boxAlgorithm: algorithm,
					publicKey: result.publicKey
				})
			};
		});
	}

	/** @inheritDoc */
	public async open (
		cyphertext: Uint8Array,
		keyPair: IKeyPair | IPrivateKeyring
	) : Promise<Uint8Array> {
		const potassiumCyphertext = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{cyphertext}
		);

		const algorithm = potassiumCyphertext.boxAlgorithm;

		keyPair = potassiumEncoding.openKeyring(
			PotassiumData.BoxAlgorithms,
			keyPair,
			algorithm
		);

		const potassiumPrivateKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{privateKey: keyPair.privateKey}
		);
		const potassiumPublicKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{publicKey: keyPair.publicKey}
		);

		if (
			potassiumPrivateKey.boxAlgorithm !== algorithm ||
			potassiumPublicKey.boxAlgorithm !== algorithm
		) {
			throw new Error(
				'Cyphertext - key pair Box algorithm mismatch (open).'
			);
		}

		switch (algorithm) {
			case PotassiumData.BoxAlgorithms.NativeV1:
			case PotassiumData.BoxAlgorithms.V1:
				const privateSubKeys = await this.v1SplitPrivateKey(
					algorithm,
					potassiumPrivateKey.privateKey
				);
				const publicSubKeys = await this.v1SplitPublicKey(
					algorithm,
					potassiumPublicKey.publicKey
				);

				return this.v1PublicKeyDecrypt(
					algorithm,
					await this.v1PublicKeyDecrypt(
						algorithm,
						await this.v1PublicKeyDecrypt(
							algorithm,
							await this.v1PublicKeyDecrypt(
								algorithm,
								cyphertext,
								privateSubKeys.sidh,
								sidh,
								'SIDH',
								false
							),
							privateSubKeys.ntru,
							ntru,
							'NTRU'
						),
						privateSubKeys.mceliece,
						mceliece,
						'McEliece'
					),
					{
						privateKey: privateSubKeys.classical,
						publicKey: publicSubKeys.classical
					},
					this.v1ClassicalCypher(algorithm),
					'Classical'
				);

			default:
				throw new Error('Invalid Box algorithm (open).');
		}
	}

	/** @inheritDoc */
	public async seal (
		plaintext: Uint8Array,
		publicKey: Uint8Array | IPublicKeyring
	) : Promise<Uint8Array> {
		publicKey = potassiumEncoding.openKeyring(
			PotassiumData.BoxAlgorithms,
			publicKey,
			this.currentAlgorithmInternal
		);

		const potassiumPublicKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{publicKey}
		);

		const algorithm = potassiumPublicKey.boxAlgorithm;

		let result: Uint8Array;

		switch (algorithm) {
			case PotassiumData.BoxAlgorithms.NativeV1:
			case PotassiumData.BoxAlgorithms.V1:
				const publicSubKeys = await this.v1SplitPublicKey(
					algorithm,
					potassiumPublicKey.publicKey
				);

				result = await this.v1PublicKeyEncrypt(
					algorithm,
					await this.v1PublicKeyEncrypt(
						algorithm,
						await this.v1PublicKeyEncrypt(
							algorithm,
							await this.v1PublicKeyEncrypt(
								algorithm,
								plaintext,
								publicSubKeys.classical,
								this.v1ClassicalCypher(algorithm),
								'Classical',
								false
							),
							publicSubKeys.mceliece,
							mceliece,
							'McEliece'
						),
						publicSubKeys.ntru,
						ntru,
						'NTRU'
					),
					publicSubKeys.sidh,
					sidh,
					'SIDH'
				);
				break;

			default:
				throw new Error('Invalid Box algorithm (seal).');
		}

		return potassiumEncoding.serialize({
			boxAlgorithm: algorithm,
			cyphertext: result
		});
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean,

		/** @ignore */
		private readonly oneTimeAuth: IOneTimeAuth,

		/** @ignore */
		private readonly secretBox: ISecretBox
	) {}
}
