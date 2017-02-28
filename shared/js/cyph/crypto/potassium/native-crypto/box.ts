import {IKeyPair} from '../../ikey-pair';
import {potassiumUtil} from '../potassium-util';
import {importHelper} from './import-helper';
import {oneTimeAuth} from './one-time-auth';
import {secretBox} from './secret-box';


/** Equivalent to sodium.crypto_box. */
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
		const keyPair: CryptoKeyPair	= await crypto.subtle.generateKey(
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
			keyType: this.algorithm.name,
			publicKey,
			privateKey
		};
	}

	/** Decrypts cyphertext. */
	public async open (
		cyphertext: Uint8Array,
		nonce: Uint8Array,
		keyPair: IKeyPair
	) : Promise<Uint8Array> {
		const asymmetricCyphertext: Uint8Array	= new Uint8Array(
			cyphertext.buffer,
			cyphertext.byteOffset,
			this.algorithm.modulusLengthBytes
		);

		const asymmetricPlaintext: Uint8Array	= new Uint8Array(
			await crypto.subtle.decrypt(
				this.algorithm.name,
				await importHelper.importJWK(
					keyPair.privateKey,
					this.algorithm,
					'decrypt'
				),
				asymmetricCyphertext
			)
		);

		const symmetricKey: Uint8Array			= new Uint8Array(
			asymmetricPlaintext.buffer,
			0,
			secretBox.keyBytes
		);

		const symmetricCyphertext: Uint8Array	= new Uint8Array(
			cyphertext.buffer,
			cyphertext.byteOffset +
				this.algorithm.modulusLengthBytes +
				oneTimeAuth.bytes
		);

		const macKey: Uint8Array				= new Uint8Array(
			asymmetricPlaintext.buffer,
			secretBox.keyBytes
		);

		const mac: Uint8Array					= new Uint8Array(
			cyphertext.buffer,
			cyphertext.byteOffset +
				this.algorithm.modulusLengthBytes
			,
			oneTimeAuth.bytes
		);

		const plaintext: Uint8Array	= await secretBox.open(
			symmetricCyphertext,
			nonce,
			symmetricKey
		);

		const isValid: boolean		= await oneTimeAuth.verify(
			mac,
			asymmetricCyphertext,
			macKey
		);

		potassiumUtil.clearMemory(asymmetricPlaintext);

		if (isValid) {
			return plaintext;
		}
		else {
			potassiumUtil.clearMemory(plaintext);
			throw new Error('Invalid RSA cyphertext.');
		}
	}

	/** Encrypts plaintext. */
	public async seal (
		plaintext: Uint8Array,
		nonce: Uint8Array,
		publicKey: Uint8Array
	) : Promise<Uint8Array> {
		const asymmetricPlaintext: Uint8Array	= potassiumUtil.randomBytes(
			secretBox.keyBytes + oneTimeAuth.keyBytes
		);

		const symmetricKey: Uint8Array			= new Uint8Array(
			asymmetricPlaintext.buffer,
			0,
			secretBox.keyBytes
		);

		const symmetricCyphertext: Uint8Array	= await secretBox.seal(
			plaintext,
			nonce,
			symmetricKey
		);

		const asymmetricCyphertext: Uint8Array	= new Uint8Array(
			await crypto.subtle.encrypt(
				this.algorithm.name,
				await importHelper.importJWK(
					publicKey,
					this.algorithm,
					'encrypt'
				),
				asymmetricPlaintext
			)
		);

		const macKey: Uint8Array				= new Uint8Array(
			asymmetricPlaintext.buffer,
			secretBox.keyBytes
		);

		const mac: Uint8Array					= await oneTimeAuth.sign(
			asymmetricCyphertext,
			macKey
		);

		potassiumUtil.clearMemory(asymmetricPlaintext);

		return potassiumUtil.concatMemory(
			true,
			asymmetricCyphertext,
			mac,
			symmetricCyphertext
		);
	}

	constructor () {}
}

/** @see Box */
export const box	= new Box();
