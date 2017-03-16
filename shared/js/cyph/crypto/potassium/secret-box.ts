import {sodium} from 'libsodium';
import {ISecretBox} from './isecret-box';
import * as NativeCrypto from './native-crypto';
import {potassiumUtil} from './potassium-util';


/** @inheritDoc */
export class SecretBox implements ISecretBox {
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
				sodium.crypto_aead_chacha20poly1305_NPUBBYTES
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
				sodium.crypto_aead_chacha20poly1305_decrypt(
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
				sodium.crypto_aead_chacha20poly1305_encrypt(
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
			sodium.crypto_aead_chacha20poly1305_ABYTES
	);

	/** @inheritDoc */
	public readonly keyBytes: Promise<number>	= Promise.resolve(
		this.isNative ?
			NativeCrypto.secretBox.keyBytes :
			sodium.crypto_aead_chacha20poly1305_KEYBYTES
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

		const output: Uint8Array	= new Uint8Array(aeadBytes);
		output.set(input);
		return output;
	}

	/** @inheritDoc */
	public async newNonce (size: number) : Promise<Uint8Array> {
		if (size < 4) {
			throw new Error('Nonce size too small.');
		}

		return potassiumUtil.concatMemory(
			true,
			new Uint32Array([this.counter++]),
			potassiumUtil.randomBytes(size - 4)
		);
	}

	/** @inheritDoc */
	public async open (
		cyphertext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		const keyBytes	= await this.keyBytes;

		if (key.length % keyBytes !== 0) {
			throw new Error('Invalid key.');
		}

		cyphertext	= new Uint8Array(cyphertext);

		try {
			const nonce: Uint8Array					= new Uint8Array(
				cyphertext.buffer,
				0,
				this.helpers.nonceBytes
			);

			const symmetricCyphertext: Uint8Array	= new Uint8Array(
				cyphertext.buffer,
				this.helpers.nonceBytes
			);

			let paddedPlaintext: Uint8Array|undefined;

			for (
				let i = key.length - keyBytes;
				i >= 0;
				i -= keyBytes
			) {
				const dataToDecrypt: Uint8Array	= paddedPlaintext || symmetricCyphertext;

				paddedPlaintext	= await this.helpers.open(
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

			const plaintext: Uint8Array			= new Uint8Array(new Uint8Array(
				paddedPlaintext.buffer,
				1 + new Uint8Array(paddedPlaintext.buffer, 0, 1)[0]
			));

			potassiumUtil.clearMemory(paddedPlaintext);
			potassiumUtil.clearMemory(cyphertext);

			return plaintext;
		}
		finally {
			potassiumUtil.clearMemory(cyphertext);
		}
	}

	/** @inheritDoc */
	public async seal (
		plaintext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		const keyBytes	= await this.keyBytes;

		if (key.length % keyBytes !== 0) {
			throw new Error('Invalid key.');
		}

		const paddingLength: number			= potassiumUtil.randomBytes(1)[0];

		const paddedPlaintext: Uint8Array	= potassiumUtil.concatMemory(
			false,
			new Uint8Array([paddingLength]),
			potassiumUtil.randomBytes(paddingLength),
			plaintext
		);

		const nonce: Uint8Array	= await this.newNonce(this.helpers.nonceBytes);

		let symmetricCyphertext: Uint8Array|undefined;

		for (let i = 0 ; i < key.length ; i += keyBytes) {
			const dataToEncrypt: Uint8Array	= symmetricCyphertext || paddedPlaintext;

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

	constructor (
		/** @ignore */
		private readonly isNative: boolean,

		/** @ignore */
		private counter: number = 0
	) {}
}
