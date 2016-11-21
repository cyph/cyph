import {Lib} from '../lib';
import {Util} from '../util';


/**
 * Wrapper for SubtleCrypto key import and export APIs.
 */
export class ImportHelper {
	/** Converts raw byte array into CryptoKey object. */
	public static async importRawKey (
		key: Uint8Array,
		algorithm: any,
		purpose: string
	) : Promise<CryptoKey> {
		return Lib.subtleCrypto.importKey(
			'raw',
			new Uint8Array(key).buffer,
			algorithm,
			false,
			[purpose]
		);
	}

	/** Converts CryptoKey object into raw byte array. */
	public static async exportRawKey (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return Lib.subtleCrypto.exportKey(
			'raw',
			cryptoKey,
			algorithmName
		);
	}

	/** Converts JWK byte array into CryptoKey object. */
	public static async importJWK (
		key: Uint8Array,
		algorithm: any,
		purpose: string
	) : Promise<CryptoKey> {
		return Lib.subtleCrypto.importKey(
			'jwk',
			JSON.parse(
				Util.toString(
					new Uint8Array(key.buffer, key.byteOffset, key.indexOf(0))
				)
			),
			algorithm,
			false,
			[purpose]
		);
	}

	/** Converts CryptoKey object into JWK byte array. */
	public static async exportJWK (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return Util.fromString(
			JSON.stringify(
				await Lib.subtleCrypto.exportKey(
					'jwk',
					cryptoKey,
					algorithmName
				)
			)
		);
	}
}
