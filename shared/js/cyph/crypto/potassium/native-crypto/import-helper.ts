import {parse, stringify} from '../../../util/serialization';
import {potassiumUtil} from '../potassium-util';


/**
 * Wrapper for SubtleCrypto key import and export APIs.
 */
export class ImportHelper {
	/** Converts CryptoKey object into JWK byte array. */
	public async exportJWK (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return potassiumUtil.fromString(
			stringify(
				await (<any> crypto.subtle).exportKey(
					'jwk',
					cryptoKey,
					algorithmName
				)
			)
		);
	}

	/** Converts CryptoKey object into raw byte array. */
	public async exportRawKey (
		cryptoKey: CryptoKey,
		algorithmName: string
	) : Promise<Uint8Array> {
		return (<any> crypto.subtle).exportKey(
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
		return crypto.subtle.importKey(
			'jwk',
			parse<JsonWebKey>(
				potassiumUtil.toString(
					potassiumUtil.toBytes(key, 0, key.indexOf(0))
				)
			),
			algorithm,
			false,
			[purpose]
		);
	}

	/** Converts raw byte array into CryptoKey object. */
	public async importRawKey (
		key: Uint8Array,
		algorithm: any,
		purpose: string
	) : Promise<CryptoKey> {
		return crypto.subtle.importKey(
			'raw',
			new Uint8Array(key).buffer,
			algorithm,
			false,
			[purpose]
		);
	}

	constructor () {}
}

/** @see ImportHelper */
export const importHelper	= new ImportHelper();
