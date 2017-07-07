import {sodium} from 'libsodium';
import {ISecretBox} from './isecret-box';
import * as NativeCrypto from './native-crypto';
import {potassiumUtil} from './potassium-util';


/** @inheritDoc */
export class SecretBox implements ISecretBox {
	/** Max size of chunk to encrypt, 32 MB. */
	private readonly chunkSize: number	= 33554432;

	/** @ignore */
	private readonly helpers: {
		nonceBytes: number;
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
		nonceBytes:
			this.isNative ?
				NativeCrypto.secretBox.nonceBytes :
				sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
		,

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
				sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
					undefined,
					cyphertext,
					additionalData,
					nonce,
					key
				)
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
				sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
					plaintext,
					additionalData,
					undefined,
					nonce,
					key
				)
	};

	/** @inheritDoc */
	public readonly aeadBytes: Promise<number>	= Promise.resolve(
		this.isNative ?
			NativeCrypto.secretBox.aeadBytes :
			sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES
	);

	/** @inheritDoc */
	public readonly keyBytes: Promise<number>	= Promise.resolve(
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

		if (input.length > aeadBytes) {
			throw new Error('Too much additional data.');
		}

		const output	= new Uint8Array(aeadBytes);
		output.set(input);
		return output;
	}

	/** @ignore */
	private async openChunk (
		cyphertext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		const keyBytes	= await this.keyBytes;

		if (key.length % keyBytes !== 0) {
			throw new Error('Invalid key.');
		}

		const nonce					= new Uint8Array(
			cyphertext.buffer,
			cyphertext.byteOffset,
			this.helpers.nonceBytes
		);

		const symmetricCyphertext	= new Uint8Array(
			cyphertext.buffer,
			cyphertext.byteOffset + this.helpers.nonceBytes,
			cyphertext.byteLength - this.helpers.nonceBytes
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
				new Uint8Array(
					key.buffer,
					key.byteOffset + i,
					keyBytes
				),
				await this.getAdditionalData(additionalData)
			);

			potassiumUtil.clearMemory(dataToDecrypt);
		}

		if (!paddedPlaintext) {
			throw new Error('Padded plaintext empty.');
		}

		const plaintext	= new Uint8Array(new Uint8Array(
			paddedPlaintext.buffer,
			new Uint8Array(paddedPlaintext.buffer, 0, 1)[0] + 1
		));

		potassiumUtil.clearMemory(paddedPlaintext);

		return plaintext;
	}

	/** @ignore */
	private async sealChunk (
		plaintext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		const keyBytes	= await this.keyBytes;

		if (key.length % keyBytes !== 0) {
			throw new Error('Invalid key.');
		}

		const paddingLength		= potassiumUtil.randomBytes(1)[0];

		const paddedPlaintext	= potassiumUtil.concatMemory(
			false,
			new Uint8Array([paddingLength]),
			potassiumUtil.randomBytes(paddingLength),
			plaintext
		);

		const nonce	= potassiumUtil.randomBytes(this.helpers.nonceBytes);

		let symmetricCyphertext: Uint8Array|undefined;

		for (let i = 0 ; i < key.length ; i += keyBytes) {
			const dataToEncrypt	= symmetricCyphertext || paddedPlaintext;

			symmetricCyphertext	= await this.helpers.seal(
				dataToEncrypt,
				nonce,
				new Uint8Array(
					key.buffer,
					key.byteOffset + i,
					keyBytes
				),
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
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		if (this.isNative) {
			return this.openChunk(cyphertext, key, additionalData);
		}

		const chunks: Uint8Array[]	= [];
		const cyphertextView		= new DataView(
			cyphertext.buffer,
			cyphertext.byteOffset,
			cyphertext.byteLength
		);

		for (let i = 0 ; i < cyphertext.length ; ) {
			const chunkSize	= cyphertextView.getUint32(i, true);

			i += 4;

			chunks.push(await this.openChunk(
				new Uint8Array(
					cyphertext.buffer,
					cyphertext.byteOffset + i,
					chunkSize
				),
				key
			));

			i += chunkSize;
		}

		return potassiumUtil.concatMemory(true, ...chunks);
	}

	/** @inheritDoc */
	public async seal (
		plaintext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		if (this.isNative) {
			return this.sealChunk(plaintext, key, additionalData);
		}

		const chunks: Uint8Array[]	= [];

		for (let i = 0 ; i < plaintext.length ; i += this.chunkSize) {
			chunks.push(await this.sealChunk(
				new Uint8Array(
					plaintext.buffer,
					i,
					(plaintext.length - i) > this.chunkSize ?
						this.chunkSize :
						undefined
				),
				key
			));
		}

		return potassiumUtil.concatMemory(true, ...chunks.map(chunk =>
			potassiumUtil.concatMemory(
				true,
				new Uint32Array([chunk.length]),
				chunk
			)
		));
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean
	) {}
}
