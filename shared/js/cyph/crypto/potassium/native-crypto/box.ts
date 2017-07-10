import {IKeyPair} from '../../../../proto';
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
	public async open (
		cyphertext: Uint8Array,
		nonce: Uint8Array,
		keyPair: IKeyPair
	) : Promise<Uint8Array> {
		const asymmetricCyphertext	= potassiumUtil.toBytes(
			cyphertext,
			undefined,
			this.algorithm.modulusLengthBytes
		);

		const asymmetricPlaintext	= new Uint8Array(
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

		const symmetricKey			= potassiumUtil.toBytes(
			asymmetricPlaintext,
			undefined,
			secretBox.keyBytes
		);

		const symmetricCyphertext	= potassiumUtil.toBytes(
			cyphertext,
			this.algorithm.modulusLengthBytes + oneTimeAuth.bytes
		);

		const macKey				= potassiumUtil.toBytes(
			asymmetricPlaintext,
			secretBox.keyBytes,
			oneTimeAuth.keyBytes
		);

		const mac					= potassiumUtil.toBytes(
			cyphertext,
			this.algorithm.modulusLengthBytes,
			oneTimeAuth.bytes
		);

		const plaintext				= await secretBox.open(
			symmetricCyphertext,
			nonce,
			symmetricKey
		);

		const isValid				= await oneTimeAuth.verify(
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
		const asymmetricPlaintext	= potassiumUtil.randomBytes(
			secretBox.keyBytes + oneTimeAuth.keyBytes
		);

		const symmetricKey			= potassiumUtil.toBytes(
			asymmetricPlaintext,
			undefined,
			secretBox.keyBytes
		);

		const symmetricCyphertext	= await secretBox.seal(
			plaintext,
			nonce,
			symmetricKey
		);

		const asymmetricCyphertext	= new Uint8Array(
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

		const macKey				= potassiumUtil.toBytes(
			asymmetricPlaintext,
			secretBox.keyBytes,
			oneTimeAuth.keyBytes
		);

		const mac					= await oneTimeAuth.sign(
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
