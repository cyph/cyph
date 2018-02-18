import {sodium} from 'libsodium';
import {IHash} from './ihash';
import {ISecretBox} from './isecret-box';
import * as NativeCrypto from './native-crypto';
import {potassiumUtil} from './potassium-util';


/** @inheritDoc */
export class SecretBox implements ISecretBox {
	/** Max size of chunk to encrypt, 32 MB. */
	private readonly chunkSize: number	= 33554432;

	/** @ignore */
	private readonly helpers: {
		nonceBytes: Promise<number>;
		open: (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) => Promise<Uint8Array>;
		seal: (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) => Promise<Uint8Array>;
	}	= {
		nonceBytes: sodium.ready.then(() =>
			this.isNative ?
				NativeCrypto.secretBox.nonceBytes :
				sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
		),

		open: async (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) : Promise<Uint8Array> =>
			this.isNative ?
				NativeCrypto.secretBox.open(
					cyphertext,
					nonce,
					key,
					additionalData
				) :
				sodium.ready.then(() => sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
					undefined,
					cyphertext,
					additionalData,
					nonce,
					key
				))
		,

		seal: async (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) : Promise<Uint8Array> =>
			this.isNative ?
				NativeCrypto.secretBox.seal(
					plaintext,
					nonce,
					key,
					additionalData
				) :
				sodium.ready.then(() => sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
					plaintext,
					additionalData,
					undefined,
					nonce,
					key
				))
	};

	/** @inheritDoc */
	public readonly aeadBytes: Promise<number>	= sodium.ready.then(() =>
		this.isNative ?
			NativeCrypto.secretBox.aeadBytes :
			sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES
	);

	/** @inheritDoc */
	public readonly keyBytes: Promise<number>	= sodium.ready.then(() =>
		this.isNative ?
			NativeCrypto.secretBox.keyBytes :
			sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES
	);

	/** @ignore */
	private async getAdditionalData (input?: Uint8Array) : Promise<Uint8Array|undefined> {
		const aeadBytes	= await this.aeadBytes;

		if (!input || input.length === aeadBytes) {
			return input;
		}

		return this.hash.deriveKey(input, aeadBytes);
	}

	/** @ignore */
	private async openChunk (
		cyphertext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		const keyBytes	= await this.keyBytes;

		if (key.length === 0 || key.length % keyBytes !== 0) {
			throw new Error('Invalid key.');
		}

		const nonce					= potassiumUtil.toBytes(
			cyphertext,
			0,
			await this.helpers.nonceBytes
		);

		const symmetricCyphertext	= potassiumUtil.toBytes(
			cyphertext,
			await this.helpers.nonceBytes
		);

		let paddedPlaintext: Uint8Array|undefined;

		for (
			let i = key.length - keyBytes;
			i >= 0;
			i -= keyBytes
		) {
			const dataToDecrypt		= paddedPlaintext || symmetricCyphertext;

			paddedPlaintext			= await this.helpers.open(
				dataToDecrypt,
				nonce,
				potassiumUtil.toBytes(key, i, keyBytes),
				await this.getAdditionalData(additionalData)
			);

			potassiumUtil.clearMemory(dataToDecrypt);
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
		plaintext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		const keyBytes	= await this.keyBytes;

		if (key.length === 0 || key.length % keyBytes !== 0) {
			throw new Error('Invalid key.');
		}

		const paddingLength		= potassiumUtil.randomBytes(1)[0];

		const paddedPlaintext	= potassiumUtil.concatMemory(
			false,
			new Uint8Array([paddingLength]),
			potassiumUtil.randomBytes(paddingLength),
			plaintext
		);

		const nonce	= potassiumUtil.randomBytes(await this.helpers.nonceBytes);

		let symmetricCyphertext: Uint8Array|undefined;

		for (let i = 0 ; i < key.length ; i += keyBytes) {
			const dataToEncrypt	= symmetricCyphertext || paddedPlaintext;

			symmetricCyphertext	= await this.helpers.seal(
				dataToEncrypt,
				nonce,
				potassiumUtil.toBytes(key, i, keyBytes),
				await this.getAdditionalData(additionalData)
			);

			potassiumUtil.clearMemory(dataToEncrypt);
		}

		if (!symmetricCyphertext) {
			throw new Error('Symmetric cyphertext empty.');
		}

		return potassiumUtil.concatMemory(
			true,
			nonce,
			symmetricCyphertext
		);
	}

	/** @inheritDoc */
	public async open (
		cyphertext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array|string
	) : Promise<Uint8Array> {
		const additionalDataBytes	= typeof additionalData === 'string' ?
			potassiumUtil.fromString(additionalData) :
			additionalData
		;

		if (this.isNative) {
			return this.openChunk(cyphertext, key, additionalDataBytes);
		}

		return potassiumUtil.concatMemory(true, ...(await Promise.all(
			potassiumUtil.splitBytes(cyphertext).map(async c =>
				this.openChunk(c, key, additionalDataBytes)
			)
		)));
	}

	/** @inheritDoc */
	public async seal (
		plaintext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array|string
	) : Promise<Uint8Array> {
		const additionalDataBytes	= typeof additionalData === 'string' ?
			potassiumUtil.fromString(additionalData) :
			additionalData
		;

		if (this.isNative) {
			return this.sealChunk(plaintext, key, additionalDataBytes);
		}

		return potassiumUtil.joinBytes(...(await Promise.all(
			potassiumUtil.chunkBytes(plaintext, this.chunkSize).map(async m =>
				this.sealChunk(m, key, additionalDataBytes)
			)
		)));
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean,

		/** @ignore */
		private readonly hash: IHash
	) {}
}
