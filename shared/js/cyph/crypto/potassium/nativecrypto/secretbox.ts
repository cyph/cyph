import {Lib} from '../lib';
import {ImportHelper} from './importhelper';


/** Equivalent to sodium.crypto_secretbox. */
export class SecretBox {
	/** Algorithm name. */
	public static readonly algorithm: string	= 'AES-GCM';

	/** Additional data length. */
	public static readonly aeadBytes: number	= 16;

	/** Key length. */
	public static readonly keyBytes: number		= 32;

	/** Nonce length. */
	public static readonly nonceBytes: number	= 12;

	/** Encrypts plaintext. */
	public static async seal (
		plaintext: Uint8Array,
		nonce: Uint8Array,
		key: Uint8Array,
		additionalData: Uint8Array = new Uint8Array(
			SecretBox.aeadBytes
		)
	) : Promise<Uint8Array> {
		return new Uint8Array(
			await Lib.subtleCrypto.encrypt(
				{
					additionalData,
					iv: nonce,
					name: SecretBox.algorithm
				},
				await ImportHelper.importRawKey(
					key,
					SecretBox.algorithm,
					'encrypt'
				),
				plaintext
			)
		);
	}

	/** Decrypts cyphertext. */
	public static async open (
		cyphertext: Uint8Array,
		nonce: Uint8Array,
		key: Uint8Array,
		additionalData: Uint8Array = new Uint8Array(
			SecretBox.aeadBytes
		)
	) : Promise<Uint8Array> {
		return new Uint8Array(
			await Lib.subtleCrypto.decrypt(
				{
					additionalData,
					iv: nonce,
					name: SecretBox.algorithm
				},
				await ImportHelper.importRawKey(
					key,
					SecretBox.algorithm,
					'decrypt'
				),
				cyphertext
			)
		);
	}
}
