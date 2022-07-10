import {sodium} from 'libsodium';
import memoize from 'lodash-es/memoize';
import {IPotassiumData, IPrivateKeyring, PotassiumData} from '../../../proto';
import {IHash} from './ihash';
import {ISecretBox} from './isecret-box';
import * as NativeCrypto from './native-crypto';
import {potassiumEncoding} from './potassium-encoding';
import {potassiumUtil} from './potassium-util';

/** @inheritDoc */
export class SecretBox implements ISecretBox {
	/** Max size of chunk to encrypt, 32 MB. */
	private readonly chunkSize: number = 33554432;

	/** @ignore */
	private readonly currentAlgorithmInternal = !this.isNative ?
		PotassiumData.SecretBoxAlgorithms.V1 :
		PotassiumData.SecretBoxAlgorithms.NativeV1;

	/** @see PotassiumEncoding.deserialize */
	private readonly defaultMetadata: IPotassiumData & {
		secretBoxAlgorithm: PotassiumData.SecretBoxAlgorithms;
	} = {
		secretBoxAlgorithm: PotassiumData.SecretBoxAlgorithms.V1
	};

	/** @ignore */
	private readonly helpers = {
		getNonceBytes: async (
			algorithm: PotassiumData.SecretBoxAlgorithms
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.SecretBoxAlgorithms.NativeV1:
					return NativeCrypto.secretBox.nonceBytes;

				case PotassiumData.SecretBoxAlgorithms.V1:
					return sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;

				default:
					throw new Error(
						'Invalid SecretBox algorithm (nonce bytes).'
					);
			}
		},

		open: async (
			algorithm: PotassiumData.SecretBoxAlgorithms,
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) : Promise<Uint8Array> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.SecretBoxAlgorithms.NativeV1:
					return NativeCrypto.secretBox.open(
						cyphertext,
						nonce,
						key,
						additionalData
					);

				case PotassiumData.SecretBoxAlgorithms.V1:
					return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
						undefined,
						cyphertext,
						additionalData,
						nonce,
						key
					);

				default:
					throw new Error('Invalid SecretBox algorithm (open).');
			}
		},
		seal: async (
			algorithm: PotassiumData.SecretBoxAlgorithms,
			plaintext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) : Promise<Uint8Array> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.SecretBoxAlgorithms.NativeV1:
					return NativeCrypto.secretBox.seal(
						plaintext,
						nonce,
						key,
						additionalData
					);

				case PotassiumData.SecretBoxAlgorithms.V1:
					return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
						plaintext,
						additionalData,
						undefined,
						nonce,
						key
					);

				default:
					throw new Error('Invalid SecretBox algorithm (seal).');
			}
		}
	};

	/** @inheritDoc */
	public readonly currentAlgorithm = Promise.resolve(
		this.currentAlgorithmInternal
	);

	/** @inheritDoc */
	public readonly getAeadBytes = memoize(
		async (
			algorithm: PotassiumData.SecretBoxAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.SecretBoxAlgorithms.NativeV1:
					return NativeCrypto.secretBox.aeadBytes;

				case PotassiumData.SecretBoxAlgorithms.V1:
					return sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES;

				default:
					throw new Error(
						'Invalid SecretBox algorithm (AEAD bytes).'
					);
			}
		}
	);

	/** @inheritDoc */
	public readonly getKeyBytes = memoize(
		async (
			algorithm: PotassiumData.SecretBoxAlgorithms = this
				.currentAlgorithmInternal
		) : Promise<number> => {
			await sodium.ready;

			switch (algorithm) {
				case PotassiumData.SecretBoxAlgorithms.NativeV1:
					return NativeCrypto.secretBox.keyBytes;

				case PotassiumData.SecretBoxAlgorithms.V1:
					return sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES;

				default:
					throw new Error('Invalid SecretBox algorithm (key bytes).');
			}
		}
	);

	/** @ignore */
	private async getAdditionalData (
		algorithm: PotassiumData.SecretBoxAlgorithms,
		input?: Uint8Array
	) : Promise<Uint8Array | undefined> {
		const aeadBytes = await this.getAeadBytes(algorithm);

		if (!input || input.length === aeadBytes) {
			return input;
		}

		return this.hash.deriveKey(input, aeadBytes);
	}

	/** @ignore */
	private async openChunk (
		algorithm: PotassiumData.SecretBoxAlgorithms,
		cyphertext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		const [keyBytes, nonceBytes] = await Promise.all([
			this.getKeyBytes(algorithm),
			this.helpers.getNonceBytes(algorithm)
		]);

		if (key.length === 0 || key.length % keyBytes !== 0) {
			throw new Error('Invalid key.');
		}

		const nonce = potassiumUtil.toBytes(cyphertext, 0, nonceBytes);

		const symmetricCyphertext = potassiumUtil.toBytes(
			cyphertext,
			nonceBytes
		);

		let paddedPlaintext: Uint8Array | undefined;

		for (let i = key.length - keyBytes; i >= 0; i -= keyBytes) {
			const dataToDecrypt = paddedPlaintext || symmetricCyphertext;

			paddedPlaintext = await this.helpers.open(
				algorithm,
				dataToDecrypt,
				nonce,
				potassiumUtil.toBytes(key, i, keyBytes),
				await this.getAdditionalData(algorithm, additionalData)
			);

			if (dataToDecrypt !== symmetricCyphertext) {
				potassiumUtil.clearMemory(dataToDecrypt);
			}
		}

		if (!paddedPlaintext) {
			throw new Error('Padded plaintext empty.');
		}

		return potassiumUtil.toBytes(
			paddedPlaintext,
			potassiumUtil.toDataView(paddedPlaintext).getUint8(0) + 1
		);
	}

	/** @ignore */
	private async sealChunk (
		algorithm: PotassiumData.SecretBoxAlgorithms,
		plaintext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		const [keyBytes, nonceBytes] = await Promise.all([
			this.getKeyBytes(algorithm),
			this.helpers.getNonceBytes(algorithm)
		]);

		if (key.length === 0 || key.length % keyBytes !== 0) {
			throw new Error('Invalid key.');
		}

		const paddingLength = potassiumUtil.randomBytes(1)[0];

		const paddedPlaintext = potassiumUtil.concatMemory(
			false,
			new Uint8Array([paddingLength]),
			potassiumUtil.randomBytes(paddingLength),
			plaintext
		);

		const nonce = potassiumUtil.randomBytes(nonceBytes);

		let symmetricCyphertext: Uint8Array | undefined;

		for (let i = 0; i < key.length; i += keyBytes) {
			const dataToEncrypt = symmetricCyphertext || paddedPlaintext;

			symmetricCyphertext = await this.helpers.seal(
				algorithm,
				dataToEncrypt,
				nonce,
				potassiumUtil.toBytes(key, i, keyBytes),
				await this.getAdditionalData(algorithm, additionalData)
			);

			potassiumUtil.clearMemory(dataToEncrypt);
		}

		if (!symmetricCyphertext) {
			throw new Error('Symmetric cyphertext empty.');
		}

		return potassiumUtil.concatMemory(true, nonce, symmetricCyphertext);
	}

	/** @inheritDoc */
	public async generateKey (
		algorithm: PotassiumData.SecretBoxAlgorithms = this
			.currentAlgorithmInternal
	) : Promise<Uint8Array> {
		return potassiumEncoding.serialize({
			key: potassiumUtil.randomBytes(await this.getKeyBytes()),
			secretBoxAlgorithm: algorithm
		});
	}

	/** @inheritDoc */
	public async open (
		cyphertext: Uint8Array,
		key: Uint8Array | IPrivateKeyring,
		additionalData?: Uint8Array | string
	) : Promise<Uint8Array> {
		const additionalDataBytes =
			typeof additionalData === 'string' ?
				potassiumUtil.fromString(additionalData) :
				additionalData;

		const potassiumCyphertext = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{cyphertext}
		);

		const algorithm = potassiumCyphertext.secretBoxAlgorithm;

		key = potassiumEncoding.openKeyring(
			PotassiumData.SecretBoxAlgorithms,
			key,
			this.currentAlgorithmInternal
		);

		const potassiumKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{key}
		);

		if (potassiumCyphertext.secretBoxAlgorithm !== algorithm) {
			throw new Error(
				'Key-cyphertext SecretBox algorithm mismatch (open).'
			);
		}

		return potassiumUtil.concatMemory(
			true,
			...(await Promise.all(
				potassiumUtil
					.splitBytes(potassiumCyphertext.cyphertext)
					.map(async c =>
						this.openChunk(
							algorithm,
							c,
							potassiumKey.key,
							additionalDataBytes
						)
					)
			))
		);
	}

	/** @inheritDoc */
	public async seal (
		plaintext: Uint8Array,
		key: Uint8Array | IPrivateKeyring,
		additionalData?: Uint8Array | string,
		rawOutput: boolean = false
	) : Promise<Uint8Array> {
		const additionalDataBytes =
			typeof additionalData === 'string' ?
				potassiumUtil.fromString(additionalData) :
				additionalData;

		key = potassiumEncoding.openKeyring(
			PotassiumData.SecretBoxAlgorithms,
			key,
			this.currentAlgorithmInternal
		);

		const potassiumKey = await potassiumEncoding.deserialize(
			this.defaultMetadata,
			{key}
		);

		const algorithm = potassiumKey.secretBoxAlgorithm;

		const result = potassiumUtil.joinBytes(
			...(await Promise.all(
				potassiumUtil
					.chunkBytes(plaintext, this.chunkSize)
					.map(async m =>
						this.sealChunk(
							algorithm,
							m,
							potassiumKey.key,
							additionalDataBytes
						)
					)
			))
		);

		if (rawOutput) {
			return result;
		}

		return potassiumEncoding.serialize({
			cyphertext: result,
			secretBoxAlgorithm: algorithm
		});
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean,

		/** @ignore */
		private readonly hash: IHash
	) {}
}
