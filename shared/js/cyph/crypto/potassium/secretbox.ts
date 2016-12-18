import {lib} from './lib';
import * as NativeCrypto from './nativecrypto';
import {util} from './util';


/** Equivalent to sodium.crypto_secretbox. */
export class SecretBox {
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
				lib.sodium.crypto_aead_chacha20poly1305_NPUBBYTES
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
				lib.sodium.crypto_aead_chacha20poly1305_decrypt(
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
				lib.sodium.crypto_aead_chacha20poly1305_encrypt(
					plaintext,
					additionalData,
					undefined,
					nonce,
					key
				)
	};

	/** Additional data length. */
	public readonly aeadBytes: number	=
		this.isNative ?
			NativeCrypto.secretBox.aeadBytes :
			lib.sodium.crypto_aead_chacha20poly1305_ABYTES
	;

	/** Key length. */
	public readonly keyBytes: number	=
		this.isNative ?
			NativeCrypto.secretBox.keyBytes :
			lib.sodium.crypto_aead_chacha20poly1305_KEYBYTES
	;

	/** @ignore */
	private getAdditionalData (input?: Uint8Array) : Uint8Array|undefined {
		if (!input || input.length === this.aeadBytes) {
			return input;
		}

		if (input.length > this.aeadBytes) {
			throw new Error('Too much additional data.');
		}

		const output: Uint8Array	= new Uint8Array(this.aeadBytes);
		output.set(input);
		return output;
	}

	/** Encrypts plaintext. */
	public async seal (
		plaintext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		if (key.length % this.keyBytes !== 0) {
			throw new Error('Invalid key.');
		}

		const paddingLength: number			= util.randomBytes(1)[0];

		const paddedPlaintext: Uint8Array	= util.concatMemory(
			false,
			new Uint8Array([paddingLength]),
			util.randomBytes(paddingLength),
			plaintext
		);

		const nonce: Uint8Array	= this.newNonce(this.helpers.nonceBytes);

		let symmetricCyphertext: Uint8Array|undefined;

		for (let i = 0 ; i < key.length ; i += this.keyBytes) {
			const dataToEncrypt: Uint8Array	= symmetricCyphertext || paddedPlaintext;

			symmetricCyphertext	= await this.helpers.seal(
				dataToEncrypt,
				nonce,
				new Uint8Array(
					key.buffer,
					key.byteOffset + i,
					this.keyBytes
				),
				this.getAdditionalData(additionalData)
			);

			util.clearMemory(dataToEncrypt);
		}

		if (!symmetricCyphertext) {
			throw new Error('Symmetric cyphertext empty.');
		}

		return util.concatMemory(
			true,
			nonce,
			symmetricCyphertext
		);
	}

	/** Decrypts cyphertext. */
	public async open (
		cyphertext: Uint8Array,
		key: Uint8Array,
		additionalData?: Uint8Array
	) : Promise<Uint8Array> {
		if (key.length % this.keyBytes !== 0) {
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
				let i = key.length - this.keyBytes;
				i >= 0;
				i -= this.keyBytes
			) {
				const dataToDecrypt: Uint8Array	= paddedPlaintext || symmetricCyphertext;

				paddedPlaintext	= await this.helpers.open(
					dataToDecrypt,
					nonce,
					new Uint8Array(
						key.buffer,
						key.byteOffset + i,
						this.keyBytes
					),
					this.getAdditionalData(additionalData)
				);

				util.clearMemory(dataToDecrypt);
			}

			if (!paddedPlaintext) {
				throw new Error('Padded plaintext empty.');
			}

			const plaintext: Uint8Array			= new Uint8Array(new Uint8Array(
				paddedPlaintext.buffer,
				1 + new Uint8Array(paddedPlaintext.buffer, 0, 1)[0]
			));

			util.clearMemory(paddedPlaintext);
			util.clearMemory(cyphertext);

			return plaintext;
		}
		finally {
			util.clearMemory(cyphertext);
		}
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean,

		/** @ignore */
		private readonly newNonce: (size: number) => Uint8Array
	) {}
}
