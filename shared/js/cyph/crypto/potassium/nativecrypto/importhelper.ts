import {lib} from '../lib';
import {util} from '../util';


/**
 * Wrapper for SubtleCrypto key import and export APIs.
 */
export class ImportHelper {
	/** Converts raw byte array into CryptoKey object. */
	public async importRawKey (
		key: Uint8Array,
		algorithm: any,
		purpose: string
	) : Promise<CryptoKey> {
		return lib.subtleCrypto.importKey(
			'raw',
			new Uint8Array(key).buffer,
			algorithm,
			false,
			[purpose]
		);
	}

	/** Converts CryptoKey object into raw byte array. */
	public async exportRawKey (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return lib.subtleCrypto.exportKey(
			'raw',
			cryptoKey,
			algorithmName
		);
	}

	/** Converts JWK byte array into CryptoKey object. */
	public async importJWK (
		key: Uint8Array,
		algorithm: any,
		purpose: string
	) : Promise<CryptoKey> {
		return lib.subtleCrypto.importKey(
			'jwk',
			JSON.parse(
				util.toString(
					new Uint8Array(key.buffer, key.byteOffset, key.indexOf(0))
				)
			),
			algorithm,
			false,
			[purpose]
		);
	}

	/** Converts CryptoKey object into JWK byte array. */
	public async exportJWK (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return util.fromString(
			JSON.stringify(
				await lib.subtleCrypto.exportKey(
					'jwk',
					cryptoKey,
					algorithmName
				)
			)
		);
	}

	constructor () {}
}

/** @see ImportHelper */
export const importHelper	= new ImportHelper();
