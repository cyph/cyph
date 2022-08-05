/* eslint-disable max-lines */

import {hqc} from 'hqc';
import {kyber} from 'kyber-crystals';
import {sodium} from 'libsodium';
import memoize from 'lodash-es/memoize';
import {mceliece as mcelieceLegacy} from 'mceliece-legacy';
import {ntru as ntruLegacy} from 'ntru-legacy';
import {sidh as sidhLegacy} from 'sidh-legacy';
import {MaybePromise} from '../../maybe-promise-type';
import {
	IKeyPair,
	IPotassiumData,
	IPrivateKeyring,
	IPublicKeyring,
	PotassiumData
} from '../../../proto';
import {errorToString} from '../../util/error';
import {debugLog} from '../../util/log';
import {retryUntilSuccessful} from '../../util/wait/retry-until-successful';
import {IBox} from './ibox';
import {IHash} from './ihash';
import {IOneTimeAuth} from './ione-time-auth';
import {ISecretBox} from './isecret-box';
import * as NativeCrypto from './native-crypto';
import {potassiumEncoding} from './potassium-encoding';
import {potassiumUtil} from './potassium-util';

/** @inheritDoc */
export class Box implements IBox {
	/** @ignore */
	private readonly algorithmPriorityOrderInternal = [
		PotassiumData.BoxAlgorithms.V2,
		PotassiumData.BoxAlgorithms.NativeV2,
		PotassiumData.BoxAlgorithms.V1,
		PotassiumData.BoxAlgorithms.NativeV1
	];

	/** @ignore */
	private readonly currentAlgorithmInternal = !this.isNative ?
		PotassiumData.BoxAlgorithms.V2 :
		PotassiumData.BoxAlgorithms.NativeV2;

	/** @ignore */
	private readonly defaultMetadataInternal: IPotassiumData & {
		boxAlgorithm: PotassiumData.BoxAlgorithms;
	} = {
		boxAlgorithm: PotassiumData.BoxAlgorithms.V1
	};

	/** @ignore */
	private readonly classicalCypher = memoize(
		(
			algorithm:
				| PotassiumData.BoxAlgorithms.NativeV1
				| PotassiumData.BoxAlgorithms.NativeV2
				| PotassiumData.BoxAlgorithms.V1
				| PotassiumData.BoxAlgorithms.V2
		) => ({
			decrypt:
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
				algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
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
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
				algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
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
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
				algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
					async () => NativeCrypto.box.keyPair() :
					async () =>
						sodium.ready.then(() =>
							sodium.crypto_box_curve25519xchacha20poly1305_keypair()
						),
			nonceBytes: sodium.ready.then(() =>
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
				algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
					NativeCrypto.secretBox.nonceBytes :
					sodium.crypto_box_curve25519xchacha20poly1305_NONCEBYTES
			),
			privateKeyBytes: sodium.ready.then(() =>
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
				algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
					NativeCrypto.box.privateKeyBytes :
					sodium.crypto_box_curve25519xchacha20poly1305_SECRETKEYBYTES
			),
			publicKeyBytes: sodium.ready.then(() =>
				algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
				algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
					NativeCrypto.box.publicKeyBytes :
					sodium.crypto_box_curve25519xchacha20poly1305_PUBLICKEYBYTES
			)
		})
	);

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
			algorithm: PotassiumData.BoxAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.BoxAlgorithms.NativeV1:
				case PotassiumData.BoxAlgorithms.V1:
					return (
						(await mcelieceLegacy.privateKeyBytes) +
						(await ntruLegacy.privateKeyBytes) +
						(await sidhLegacy.privateKeyBytes) +
						(await this.classicalCypher(algorithm).privateKeyBytes)
					);

				case PotassiumData.BoxAlgorithms.NativeV2:
				case PotassiumData.BoxAlgorithms.V2:
					return (
						(await hqc.privateKeyBytes) +
						(await kyber.privateKeyBytes) +
						(await this.classicalCypher(algorithm).privateKeyBytes)
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
						(await mcelieceLegacy.publicKeyBytes) +
						(await ntruLegacy.publicKeyBytes) +
						(await sidhLegacy.publicKeyBytes) +
						(await this.classicalCypher(algorithm).publicKeyBytes)
					);

				case PotassiumData.BoxAlgorithms.NativeV2:
				case PotassiumData.BoxAlgorithms.V2:
					return (
						(await hqc.publicKeyBytes) +
						(await kyber.publicKeyBytes) +
						(await this.classicalCypher(algorithm).publicKeyBytes)
					);

				default:
					throw new Error(
						'Invalid Box algorithm (public key bytes).'
					);
			}
		}
	);

	/** @ignore */
	private async baseDecrypt<SK extends IKeyPair | Uint8Array> ({
		algorithm,
		clearCyphertext,
		cypher,
		cyphertext,
		getKeys,
		name,
		oneTimeAuthAlgorithm,
		privateKey,
		secretBoxAlgorithm
	}: {
		algorithm: PotassiumData.BoxAlgorithms;
		clearCyphertext: boolean;
		cypher: {
			decrypt: (
				cyphertext: Uint8Array,
				keyPair: SK
			) => Promise<Uint8Array>;
		};
		cyphertext: Uint8Array;
		getKeys: (asymmetricPlaintext: Uint8Array) => MaybePromise<{
			authKey: Uint8Array;
			symmetricKey: Uint8Array;
		}>;
		name: string;
		oneTimeAuthAlgorithm: PotassiumData.OneTimeAuthAlgorithms;
		privateKey: SK;
		secretBoxAlgorithm: PotassiumData.SecretBoxAlgorithms;
	}) : Promise<Uint8Array> {
		const byteArraysToClear: Uint8Array[] = [];
		const errorPrefix = `${PotassiumData.BoxAlgorithms[algorithm]} (${name}) decryption error`;

		try {
			if (clearCyphertext) {
				byteArraysToClear.push(cyphertext);
			}

			const oneTimeAuthBytes = await this.oneTimeAuth.getBytes(
				oneTimeAuthAlgorithm
			);

			const [authenticatedAsymmetricCyphertext, symmetricCyphertext] =
				potassiumUtil.splitBytes(cyphertext);

			const mac = potassiumUtil.toBytes(
				authenticatedAsymmetricCyphertext,
				0,
				oneTimeAuthBytes
			);
			const asymmetricCyphertext = potassiumUtil.toBytes(
				authenticatedAsymmetricCyphertext,
				oneTimeAuthBytes
			);
			const {authKey, symmetricKey} = await getKeys(
				await cypher.decrypt(asymmetricCyphertext, privateKey)
			);

			byteArraysToClear.push(authKey, symmetricKey);

			const isValid = await this.oneTimeAuth.verify(
				mac,
				asymmetricCyphertext,
				authKey,
				oneTimeAuthAlgorithm
			);

			if (!isValid) {
				throw new Error('Auth validation failed.');
			}

			return await this.secretBox.open(
				symmetricCyphertext,
				symmetricKey,
				undefined,
				secretBoxAlgorithm
			);
		}
		catch (err) {
			throw new Error(`${errorPrefix}: ${errorToString(err)}`);
		}
		finally {
			for (const byteArray of byteArraysToClear) {
				potassiumUtil.clearMemory(byteArray);
			}
		}
	}

	/** @ignore */
	private async baseEncrypt (
		options: () => MaybePromise<{
			algorithm: PotassiumData.BoxAlgorithms;
			asymmetricCyphertext: Uint8Array;
			authKey: Uint8Array;
			clearPlaintext: boolean;
			name: string;
			oneTimeAuthAlgorithm: PotassiumData.OneTimeAuthAlgorithms;
			plaintext: Uint8Array;
			secretBoxAlgorithm: PotassiumData.SecretBoxAlgorithms;
			symmetricKey: Uint8Array;
		}>
	) : Promise<Uint8Array> {
		const byteArraysToClear: Uint8Array[] = [];
		let errorPrefix = 'Encryption error';

		try {
			const {
				algorithm,
				asymmetricCyphertext,
				authKey,
				clearPlaintext,
				name,
				oneTimeAuthAlgorithm,
				plaintext,
				secretBoxAlgorithm,
				symmetricKey
			} = await options();

			errorPrefix = `${PotassiumData.BoxAlgorithms[algorithm]} (${name}) encryption error`;

			if (clearPlaintext) {
				byteArraysToClear.push(plaintext);
			}

			const symmetricCyphertext = await this.secretBox.seal(
				plaintext,
				symmetricKey,
				undefined,
				true,
				secretBoxAlgorithm
			);

			const mac = await this.oneTimeAuth.sign(
				asymmetricCyphertext,
				authKey,
				true,
				oneTimeAuthAlgorithm
			);
			const authenticatedAsymmetricCyphertext =
				potassiumUtil.concatMemory(true, mac, asymmetricCyphertext);

			return potassiumUtil.joinBytes(
				authenticatedAsymmetricCyphertext,
				symmetricCyphertext
			);
		}
		catch (err) {
			throw new Error(`${errorPrefix}: ${errorToString(err)}`);
		}
		finally {
			for (const byteArray of byteArraysToClear) {
				potassiumUtil.clearMemory(byteArray);
			}
		}
	}

	/** @ignore */
	private async kemDecrypt<SK extends IKeyPair | Uint8Array> (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV2
			| PotassiumData.BoxAlgorithms.V2,
		cyphertext: Uint8Array,
		privateKey: SK,
		cypher: {
			decrypt: (
				cyphertext: Uint8Array,
				keyPair: SK
			) => Promise<Uint8Array>;
			encrypt: (
				publicKey: Uint8Array
			) => Promise<{cyphertext: Uint8Array; secret: Uint8Array}>;
		},
		name: string,
		clearCyphertext: boolean = true
	) : Promise<Uint8Array> {
		const oneTimeAuthAlgorithm = PotassiumData.OneTimeAuthAlgorithms.V1;
		const secretBoxAlgorithm = PotassiumData.SecretBoxAlgorithms.V1;

		const oneTimeAuthKeyBytes = await this.oneTimeAuth.getKeyBytes(
			oneTimeAuthAlgorithm
		);

		return this.baseDecrypt({
			algorithm,
			clearCyphertext,
			cypher,
			cyphertext,
			getKeys: async asymmetricPlaintext => ({
				authKey: await this.hash.deriveKey(
					asymmetricPlaintext,
					oneTimeAuthKeyBytes
				),
				symmetricKey: asymmetricPlaintext
			}),
			name,
			oneTimeAuthAlgorithm,
			privateKey,
			secretBoxAlgorithm
		});
	}

	/** @ignore */
	private async kemEncrypt (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV2
			| PotassiumData.BoxAlgorithms.V2,
		plaintext: Uint8Array,
		publicKey: Uint8Array,
		cypher: {
			encrypt: (
				publicKey: Uint8Array
			) => Promise<{cyphertext: Uint8Array; secret: Uint8Array}>;
		},
		name: string,
		clearPlaintext: boolean = true
	) : Promise<Uint8Array> {
		const oneTimeAuthAlgorithm = PotassiumData.OneTimeAuthAlgorithms.V1;
		const secretBoxAlgorithm = PotassiumData.SecretBoxAlgorithms.V1;

		const oneTimeAuthKeyBytes = await this.oneTimeAuth.getKeyBytes(
			oneTimeAuthAlgorithm
		);

		return this.baseEncrypt(async () => {
			const {cyphertext: asymmetricCyphertext, secret: symmetricKey} =
				await cypher.encrypt(publicKey);

			const authKey = await this.hash.deriveKey(
				symmetricKey,
				oneTimeAuthKeyBytes
			);

			return {
				algorithm,
				asymmetricCyphertext,
				authKey,
				clearPlaintext,
				name,
				oneTimeAuthAlgorithm,
				plaintext,
				secretBoxAlgorithm,
				symmetricKey
			};
		});
	}

	/** @ignore */
	private async publicKeyDecrypt<SK extends IKeyPair | Uint8Array> (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV1
			| PotassiumData.BoxAlgorithms.NativeV2
			| PotassiumData.BoxAlgorithms.V1
			| PotassiumData.BoxAlgorithms.V2,
		cyphertext: Uint8Array,
		privateKey: SK,
		cypher: {
			decrypt: (
				cyphertext: Uint8Array,
				keyPair: SK
			) => Promise<Uint8Array>;
			encrypt: (
				plaintext: Uint8Array,
				publicKey: Uint8Array
			) => Promise<Uint8Array>;
		},
		name: string,
		clearCyphertext: boolean = true
	) : Promise<Uint8Array> {
		const oneTimeAuthAlgorithm =
			algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
			algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
				PotassiumData.OneTimeAuthAlgorithms.NativeV1 :
				PotassiumData.OneTimeAuthAlgorithms.V1;
		const secretBoxAlgorithm =
			algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
			algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
				PotassiumData.SecretBoxAlgorithms.NativeV1 :
				PotassiumData.SecretBoxAlgorithms.V1;

		const oneTimeAuthKeyBytes = await this.oneTimeAuth.getKeyBytes(
			oneTimeAuthAlgorithm
		);

		return this.baseDecrypt({
			algorithm,
			clearCyphertext,
			cypher,
			cyphertext,
			getKeys: async asymmetricPlaintext => ({
				authKey: potassiumUtil.toBytes(
					asymmetricPlaintext,
					0,
					oneTimeAuthKeyBytes
				),
				symmetricKey: potassiumUtil.toBytes(
					asymmetricPlaintext,
					oneTimeAuthKeyBytes
				)
			}),
			name,
			oneTimeAuthAlgorithm,
			privateKey,
			secretBoxAlgorithm
		});
	}

	/** @ignore */
	private async publicKeyEncrypt (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV1
			| PotassiumData.BoxAlgorithms.NativeV2
			| PotassiumData.BoxAlgorithms.V1
			| PotassiumData.BoxAlgorithms.V2,
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
			algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
			algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
				PotassiumData.OneTimeAuthAlgorithms.NativeV1 :
				PotassiumData.OneTimeAuthAlgorithms.V1;
		const secretBoxAlgorithm =
			algorithm === PotassiumData.BoxAlgorithms.NativeV1 ||
			algorithm === PotassiumData.BoxAlgorithms.NativeV2 ?
				PotassiumData.SecretBoxAlgorithms.NativeV1 :
				PotassiumData.SecretBoxAlgorithms.V1;

		const oneTimeAuthKeyBytes = await this.oneTimeAuth.getKeyBytes(
			oneTimeAuthAlgorithm
		);
		const secretBoxKeyBytes = await this.secretBox.getKeyBytes(
			secretBoxAlgorithm
		);

		return this.baseEncrypt(async () => {
			const asymmetricPlaintext = potassiumUtil.randomBytes(
				oneTimeAuthKeyBytes + secretBoxKeyBytes
			);

			const authKey = potassiumUtil.toBytes(
				asymmetricPlaintext,
				0,
				oneTimeAuthKeyBytes
			);
			const symmetricKey = potassiumUtil.toBytes(
				asymmetricPlaintext,
				oneTimeAuthKeyBytes
			);

			const asymmetricCyphertext = await cypher.encrypt(
				asymmetricPlaintext,
				publicKey
			);

			return {
				algorithm,
				asymmetricCyphertext,
				authKey,
				clearPlaintext,
				name,
				oneTimeAuthAlgorithm,
				plaintext,
				secretBoxAlgorithm,
				symmetricKey
			};
		});
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
		const classicalCypher = this.classicalCypher(algorithm);

		return {
			classical: potassiumUtil.toBytes(
				privateKey,
				0,
				await classicalCypher.privateKeyBytes
			),
			mceliece: potassiumUtil.toBytes(
				privateKey,
				await classicalCypher.privateKeyBytes,
				await mcelieceLegacy.privateKeyBytes
			),
			ntru: potassiumUtil.toBytes(
				privateKey,
				(await classicalCypher.privateKeyBytes) +
					(await mcelieceLegacy.privateKeyBytes),
				await ntruLegacy.privateKeyBytes
			),
			sidh: potassiumUtil.toBytes(
				privateKey,
				(await classicalCypher.privateKeyBytes) +
					(await mcelieceLegacy.privateKeyBytes) +
					(await ntruLegacy.privateKeyBytes),
				await sidhLegacy.privateKeyBytes
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
		const classicalCypher = this.classicalCypher(algorithm);

		const [
			classicalCypherPublicKeyBytes,
			mceliecePublicKeyBytes,
			ntruPublicKeyBytes,
			sidhPublicKeyBytes
		] = await Promise.all([
			classicalCypher.publicKeyBytes,
			mcelieceLegacy.publicKeyBytes,
			ntruLegacy.publicKeyBytes,
			sidhLegacy.publicKeyBytes
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

	/** @ignore */
	private async v2SplitPrivateKey (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV2
			| PotassiumData.BoxAlgorithms.V2,
		privateKey: Uint8Array
	) : Promise<{
		classical: Uint8Array;
		hqc: Uint8Array;
		kyber: Uint8Array;
	}> {
		const classicalCypher = this.classicalCypher(algorithm);

		return {
			classical: potassiumUtil.toBytes(
				privateKey,
				0,
				await classicalCypher.privateKeyBytes
			),
			hqc: potassiumUtil.toBytes(
				privateKey,
				await classicalCypher.privateKeyBytes,
				await hqc.privateKeyBytes
			),
			kyber: potassiumUtil.toBytes(
				privateKey,
				(await classicalCypher.privateKeyBytes) +
					(await hqc.privateKeyBytes),
				await kyber.privateKeyBytes
			)
		};
	}

	/** @ignore */
	private async v2SplitPublicKey (
		algorithm:
			| PotassiumData.BoxAlgorithms.NativeV2
			| PotassiumData.BoxAlgorithms.V2,
		publicKey: Uint8Array
	) : Promise<{
		classical: Uint8Array;
		hqc: Uint8Array;
		kyber: Uint8Array;
	}> {
		const classicalCypher = this.classicalCypher(algorithm);

		const [
			classicalCypherPublicKeyBytes,
			hqcPublicKeyBytes,
			kyberPublicKeyBytes
		] = await Promise.all([
			classicalCypher.publicKeyBytes,
			hqc.publicKeyBytes,
			kyber.publicKeyBytes
		]);

		const logProgress = async (
			publicKeys?: () => Record<string, Uint8Array>
		) =>
			debugLog(() => ({
				splitPublicKey: {
					byteLengths: {
						classicalCypherPublicKeyBytes,
						hqcPublicKeyBytes,
						kyberPublicKeyBytes
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

		const hqcKey = potassiumUtil.toBytes(
			publicKey,
			classicalCypherPublicKeyBytes,
			hqcPublicKeyBytes
		);

		logProgress(() => ({
			classicalKey,
			hqcKey
		}));

		const kyberKey = potassiumUtil.toBytes(
			publicKey,
			classicalCypherPublicKeyBytes + hqcPublicKeyBytes,
			kyberPublicKeyBytes
		);

		logProgress(() => ({
			classicalKey,
			hqcKey,
			kyberKey
		}));

		return {
			classical: classicalKey,
			hqc: hqcKey,
			kyber: kyberKey
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
				case PotassiumData.BoxAlgorithms.V1: {
					const [
						classicalKeyPair,
						mcelieceKeyPair,
						ntruKeyPair,
						sidhKeyPair
					] = await Promise.all([
						this.classicalCypher(algorithm).keyPair(),
						mcelieceLegacy.keyPair(),
						ntruLegacy.keyPair(),
						sidhLegacy.keyPair()
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
				}

				case PotassiumData.BoxAlgorithms.NativeV2:
				case PotassiumData.BoxAlgorithms.V2: {
					const [classicalKeyPair, hqcKeyPair, kyberKeyPair] =
						await Promise.all([
							this.classicalCypher(algorithm).keyPair(),
							hqc.keyPair(),
							kyber.keyPair()
						]);

					result = {
						privateKey: potassiumUtil.concatMemory(
							true,
							classicalKeyPair.privateKey,
							hqcKeyPair.privateKey,
							kyberKeyPair.privateKey
						),
						publicKey: potassiumUtil.concatMemory(
							true,
							classicalKeyPair.publicKey,
							hqcKeyPair.publicKey,
							kyberKeyPair.publicKey
						)
					};
					break;
				}

				default:
					throw new Error('Invalid Box algorithm (key pair).');
			}

			const keyPair = {
				privateKey: await potassiumEncoding.serialize({
					boxAlgorithm: algorithm,
					privateKey: result.privateKey
				}),
				publicKey: await potassiumEncoding.serialize({
					boxAlgorithm: algorithm,
					publicKey: result.publicKey
				})
			};

			const testInput = potassiumUtil.randomBytes(32);
			if (
				!potassiumUtil.compareMemory(
					testInput,
					await this.open(
						await this.seal(testInput, keyPair.publicKey),
						keyPair
					)
				)
			) {
				throw new Error('Corrupt Potassium.Box key.');
			}

			return keyPair;
		});
	}

	/** @inheritDoc */
	public async open (
		cyphertext: Uint8Array,
		keyPair: IKeyPair | IPrivateKeyring
	) : Promise<Uint8Array> {
		const potassiumCyphertext = await potassiumEncoding.deserialize(
			this.defaultMetadataInternal,
			{cyphertext}
		);

		const algorithm = potassiumCyphertext.boxAlgorithm;

		keyPair = potassiumEncoding.openKeyring(
			PotassiumData.BoxAlgorithms,
			keyPair,
			algorithm
		);

		const potassiumPrivateKey = await potassiumEncoding.deserialize(
			this.defaultMetadataInternal,
			{privateKey: keyPair.privateKey}
		);
		const potassiumPublicKey = await potassiumEncoding.deserialize(
			this.defaultMetadataInternal,
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
			case PotassiumData.BoxAlgorithms.V1: {
				const privateSubKeys = await this.v1SplitPrivateKey(
					algorithm,
					potassiumPrivateKey.privateKey
				);
				const publicSubKeys = await this.v1SplitPublicKey(
					algorithm,
					potassiumPublicKey.publicKey
				);

				return this.publicKeyDecrypt(
					algorithm,
					await this.publicKeyDecrypt(
						algorithm,
						await this.publicKeyDecrypt(
							algorithm,
							await this.publicKeyDecrypt(
								algorithm,
								potassiumCyphertext.cyphertext,
								privateSubKeys.sidh,
								sidhLegacy,
								'SIDH',
								false
							),
							privateSubKeys.ntru,
							ntruLegacy,
							'NTRU'
						),
						privateSubKeys.mceliece,
						mcelieceLegacy,
						'McEliece'
					),
					{
						privateKey: privateSubKeys.classical,
						publicKey: publicSubKeys.classical
					},
					this.classicalCypher(algorithm),
					'Classical'
				);
			}

			case PotassiumData.BoxAlgorithms.NativeV2:
			case PotassiumData.BoxAlgorithms.V2: {
				const privateSubKeys = await this.v2SplitPrivateKey(
					algorithm,
					potassiumPrivateKey.privateKey
				);
				const publicSubKeys = await this.v2SplitPublicKey(
					algorithm,
					potassiumPublicKey.publicKey
				);

				return this.publicKeyDecrypt(
					algorithm,
					await this.kemDecrypt(
						algorithm,
						await this.kemDecrypt(
							algorithm,
							potassiumCyphertext.cyphertext,
							privateSubKeys.hqc,
							hqc,
							'HQC'
						),
						privateSubKeys.kyber,
						kyber,
						'Kyber'
					),
					{
						privateKey: privateSubKeys.classical,
						publicKey: publicSubKeys.classical
					},
					this.classicalCypher(algorithm),
					'Classical'
				);
			}

			default:
				throw new Error('Invalid Box algorithm (open).');
		}
	}

	/** @inheritDoc */
	public async seal (
		plaintext: Uint8Array,
		publicKey: Uint8Array | IPublicKeyring,
		rawOutput: boolean = false
	) : Promise<Uint8Array> {
		publicKey = potassiumEncoding.openKeyring(
			PotassiumData.BoxAlgorithms,
			publicKey,
			this.algorithmPriorityOrderInternal
		);

		const potassiumPublicKey = await potassiumEncoding.deserialize(
			this.defaultMetadataInternal,
			{publicKey}
		);

		const algorithm = potassiumPublicKey.boxAlgorithm;

		let result: Uint8Array;

		switch (algorithm) {
			case PotassiumData.BoxAlgorithms.NativeV1:
			case PotassiumData.BoxAlgorithms.V1: {
				const publicSubKeys = await this.v1SplitPublicKey(
					algorithm,
					potassiumPublicKey.publicKey
				);

				result = await this.publicKeyEncrypt(
					algorithm,
					await this.publicKeyEncrypt(
						algorithm,
						await this.publicKeyEncrypt(
							algorithm,
							await this.publicKeyEncrypt(
								algorithm,
								plaintext,
								publicSubKeys.classical,
								this.classicalCypher(algorithm),
								'Classical',
								false
							),
							publicSubKeys.mceliece,
							mcelieceLegacy,
							'McEliece'
						),
						publicSubKeys.ntru,
						ntruLegacy,
						'NTRU'
					),
					publicSubKeys.sidh,
					sidhLegacy,
					'SIDH'
				);
				break;
			}

			case PotassiumData.BoxAlgorithms.NativeV2:
			case PotassiumData.BoxAlgorithms.V2: {
				const publicSubKeys = await this.v2SplitPublicKey(
					algorithm,
					potassiumPublicKey.publicKey
				);

				result = await this.kemEncrypt(
					algorithm,
					await this.kemEncrypt(
						algorithm,
						await this.publicKeyEncrypt(
							algorithm,
							plaintext,
							publicSubKeys.classical,
							this.classicalCypher(algorithm),
							'Classical',
							false
						),
						publicSubKeys.kyber,
						kyber,
						'Kyber'
					),
					publicSubKeys.hqc,
					hqc,
					'HQC'
				);
				break;
			}

			default:
				throw new Error('Invalid Box algorithm (seal).');
		}

		if (rawOutput) {
			return result;
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
		private readonly hash: IHash,

		/** @ignore */
		private readonly oneTimeAuth: IOneTimeAuth,

		/** @ignore */
		private readonly secretBox: ISecretBox
	) {}
}
