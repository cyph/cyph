import {Hash} from '../hash';
import {IHash} from '../ihash';
import {potassiumUtil} from '../potassium-util';
import {importHelper} from './import-helper';


/** Equivalent to sodium.crypto_secretbox. */
export class SecretBox {
	/** @ignore */
	private readonly hash: IHash				= new Hash(true);

	/** @ignore */
	private readonly internalNonceBytes: number	= 12;

	/** Additional data length. */
	public readonly aeadBytes: number	= 16;

	/** Algorithm name. */
	public readonly algorithm: string	= 'AES-GCM';

	/** Key length. */
	public readonly keyBytes: number	= 32;

	/** Nonce length. */
	public readonly nonceBytes: number	= 24;

	/** @ignore */
	private async processKeyAndNonce (
		key: Uint8Array,
		nonce: Uint8Array,
		purpose: string
	) : Promise<{
		cryptoKey: CryptoKey;
		iv: Uint8Array;
	}> {
		const newKey	= await this.hash.deriveKey(
			potassiumUtil.concatMemory(
				false,
				key,
				potassiumUtil.toBytes(nonce, this.internalNonceBytes)
			),
			this.keyBytes
		);

		const cryptoKey	= await importHelper.importRawKey(newKey, this.algorithm, purpose);

		potassiumUtil.clearMemory(newKey);

		return {
			cryptoKey,
			iv: potassiumUtil.toBytes(nonce, 0, this.internalNonceBytes)
		};
	}

	/** Decrypts cyphertext. */
	public async open (
		cyphertext: Uint8Array,
		nonce: Uint8Array,
		key: Uint8Array,
		additionalData: Uint8Array = new Uint8Array(this.aeadBytes)
	) : Promise<Uint8Array> {
		const {cryptoKey, iv}	= await this.processKeyAndNonce(key, nonce, 'decrypt');

		return new Uint8Array(
			await crypto.subtle.decrypt(
				{
					additionalData,
					iv,
					name: this.algorithm
				},
				cryptoKey,
				cyphertext
			)
		);
	}

	/** Encrypts plaintext. */
	public async seal (
		plaintext: Uint8Array,
		nonce: Uint8Array,
		key: Uint8Array,
		additionalData: Uint8Array = new Uint8Array(this.aeadBytes)
	) : Promise<Uint8Array> {
		const {cryptoKey, iv}	= await this.processKeyAndNonce(key, nonce, 'encrypt');

		return new Uint8Array(
			await crypto.subtle.encrypt(
				{
					additionalData,
					iv,
					name: this.algorithm
				},
				cryptoKey,
				plaintext
			)
		);
	}

	constructor () {}
}

/** @see SecretBox */
export const secretBox	= new SecretBox();
