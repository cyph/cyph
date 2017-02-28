import {importHelper} from './import-helper';


/** Equivalent to sodium.crypto_secretbox. */
export class SecretBox {
	/** Additional data length. */
	public readonly aeadBytes: number	= 16;

	/** Algorithm name. */
	public readonly algorithm: string	= 'AES-GCM';

	/** Key length. */
	public readonly keyBytes: number	= 32;

	/** Nonce length. */
	public readonly nonceBytes: number	= 12;

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
			await crypto.subtle.decrypt(
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
			await crypto.subtle.encrypt(
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

	constructor () {}
}

/** @see SecretBox */
export const secretBox	= new SecretBox();
