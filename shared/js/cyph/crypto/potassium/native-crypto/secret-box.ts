import {lib} from '../lib';
import {importHelper} from './import-helper';


/** Equivalent to sodium.crypto_secretbox. */
export class SecretBox {
	/** Algorithm name. */
	public readonly algorithm: string	= 'AES-GCM';

	/** Additional data length. */
	public readonly aeadBytes: number	= 16;

	/** Key length. */
	public readonly keyBytes: number	= 32;

	/** Nonce length. */
	public readonly nonceBytes: number	= 12;

	/** Encrypts plaintext. */
	public async seal (
		plaintext: Uint8Array,
		nonce: Uint8Array,
		key: Uint8Array,
		additionalData: Uint8Array = new Uint8Array(
			this.aeadBytes
		)
	) : Promise<Uint8Array> {
		return new Uint8Array(
			await lib.subtleCrypto.encrypt(
				{
					additionalData,
					iv: nonce,
					name: this.algorithm
				},
				await importHelper.importRawKey(
					key,
					this.algorithm,
					'encrypt'
				),
				plaintext
			)
		);
	}

	/** Decrypts cyphertext. */
	public async open (
		cyphertext: Uint8Array,
		nonce: Uint8Array,
		key: Uint8Array,
		additionalData: Uint8Array = new Uint8Array(
			this.aeadBytes
		)
	) : Promise<Uint8Array> {
		return new Uint8Array(
			await lib.subtleCrypto.decrypt(
				{
					additionalData,
					iv: nonce,
					name: this.algorithm
				},
				await importHelper.importRawKey(
					key,
					this.algorithm,
					'decrypt'
				),
				cyphertext
			)
		);
	}

	constructor () {}
}

/** @see SecretBox */
export const secretBox	= new SecretBox();
