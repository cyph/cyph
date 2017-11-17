import {IKeyPair} from '../../../proto';
import {importHelper} from './import-helper';


/** Equivalent to sodium.crypto_box without authentication. */
export class Box {
	/** Algorithm details. */
	public readonly algorithm: {
		hash: {name: string};
		modulusLength: number;
		modulusLengthBytes: number;
		name: string;
		publicExponent: Uint8Array;
	}	= {
		hash: {
			name: 'SHA-512'
		},
		modulusLength: 4096,
		modulusLengthBytes: 512,
		name: 'RSA-OAEP',
		publicExponent: new Uint8Array([0x01, 0x00, 0x01])
	};

	/** Private key length. */
	public readonly privateKeyBytes: number	= 3250;

	/** Public key length. */
	public readonly publicKeyBytes: number	= 800;

	/** Generates key pair. */
	public async keyPair () : Promise<IKeyPair> {
		const keyPair		= await crypto.subtle.generateKey(
			this.algorithm,
			true,
			['encrypt', 'decrypt']
		);

		const publicKey		= new Uint8Array(this.publicKeyBytes);
		const privateKey	= new Uint8Array(this.privateKeyBytes);

		publicKey.set(await importHelper.exportJWK(
			keyPair.publicKey,
			this.algorithm.name
		));

		privateKey.set(await importHelper.exportJWK(
			keyPair.privateKey,
			this.algorithm.name
		));

		return {
			privateKey,
			publicKey
		};
	}

	/** Decrypts cyphertext. */
	public async open (cyphertext: Uint8Array, keyPair: IKeyPair) : Promise<Uint8Array> {
		return new Uint8Array(
			await crypto.subtle.decrypt(
				this.algorithm.name,
				await importHelper.importJWK(
					keyPair.privateKey,
					this.algorithm,
					'decrypt'
				),
				cyphertext
			)
		);
	}

	/** Encrypts plaintext. */
	public async seal (plaintext: Uint8Array, publicKey: Uint8Array) : Promise<Uint8Array> {
		return new Uint8Array(
			await crypto.subtle.encrypt(
				this.algorithm.name,
				await importHelper.importJWK(
					publicKey,
					this.algorithm,
					'encrypt'
				),
				plaintext
			)
		);
	}

	constructor () {}
}

/** @see Box */
export const box	= new Box();
