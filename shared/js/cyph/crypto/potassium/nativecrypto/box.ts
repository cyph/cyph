import {Lib} from '../lib';
import {Util} from '../util';
import {ImportHelper} from './importhelper';
import {OneTimeAuth} from './onetimeauth';
import {SecretBox} from './secretbox';


/** Equivalent to sodium.crypto_box. */
export class Box {
	/** Algorithm details. */
	public static algorithm: {
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

	/** Public key length. */
	public static publicKeyBytes: number	= 800;

	/** Private key length. */
	public static privateKeyBytes: number	= 3250;

	/** Generates key pair. */
	public static async keyPair () : Promise<{
		keyType: string;
		publicKey: Uint8Array;
		privateKey: Uint8Array;
	}> {
		const keyPair: CryptoKeyPair	= await Lib.subtleCrypto.generateKey(
			Box.algorithm,
			true,
			['encrypt', 'decrypt']
		);

		const publicKey		= new Uint8Array(Box.publicKeyBytes);
		const privateKey	= new Uint8Array(Box.privateKeyBytes);

		publicKey.set(await ImportHelper.exportJWK(
			keyPair.publicKey,
			Box.algorithm.name
		));

		privateKey.set(await ImportHelper.exportJWK(
			keyPair.privateKey,
			Box.algorithm.name
		));

		return {
			keyType: Box.algorithm.name,
			publicKey,
			privateKey
		};
	}

	/** Encrypts plaintext. */
	public static async seal (
		plaintext: Uint8Array,
		nonce: Uint8Array,
		publicKey: Uint8Array
	) : Promise<Uint8Array> {
		const asymmetricPlaintext: Uint8Array	= Util.randomBytes(
			SecretBox.keyBytes + OneTimeAuth.keyBytes
		);

		const symmetricKey: Uint8Array			= new Uint8Array(
			asymmetricPlaintext.buffer,
			0,
			SecretBox.keyBytes
		);

		const symmetricCyphertext: Uint8Array	= await SecretBox.seal(
			plaintext,
			nonce,
			symmetricKey
		);

		const asymmetricCyphertext: Uint8Array	= new Uint8Array(
			await Lib.subtleCrypto.encrypt(
				Box.algorithm.name,
				await ImportHelper.importJWK(
					publicKey,
					Box.algorithm,
					'encrypt'
				),
				asymmetricPlaintext
			)
		);

		const macKey: Uint8Array				= new Uint8Array(
			asymmetricPlaintext.buffer,
			SecretBox.keyBytes
		);

		const mac: Uint8Array					= await OneTimeAuth.sign(
			asymmetricCyphertext,
			macKey
		);

		Util.clearMemory(asymmetricPlaintext);

		return Util.concatMemory(
			true,
			asymmetricCyphertext,
			mac,
			symmetricCyphertext
		);
	}

	/** Decrypts cyphertext. */
	public static async open (
		cyphertext: Uint8Array,
		nonce: Uint8Array,
		keyPair: {publicKey: Uint8Array; privateKey: Uint8Array}
	) : Promise<Uint8Array> {
		const asymmetricCyphertext: Uint8Array	= new Uint8Array(
			cyphertext.buffer,
			cyphertext.byteOffset,
			Box.algorithm.modulusLengthBytes
		);

		const asymmetricPlaintext: Uint8Array	= new Uint8Array(
			await Lib.subtleCrypto.decrypt(
				Box.algorithm.name,
				await ImportHelper.importJWK(
					keyPair.privateKey,
					Box.algorithm,
					'decrypt'
				),
				asymmetricCyphertext
			)
		);

		const symmetricKey: Uint8Array			= new Uint8Array(
			asymmetricPlaintext.buffer,
			0,
			SecretBox.keyBytes
		);

		const symmetricCyphertext: Uint8Array	= new Uint8Array(
			cyphertext.buffer,
			cyphertext.byteOffset +
				Box.algorithm.modulusLengthBytes +
				OneTimeAuth.bytes
		);

		const macKey: Uint8Array				= new Uint8Array(
			asymmetricPlaintext.buffer,
			SecretBox.keyBytes
		);

		const mac: Uint8Array					= new Uint8Array(
			cyphertext.buffer,
			cyphertext.byteOffset +
				Box.algorithm.modulusLengthBytes
			,
			OneTimeAuth.bytes
		);

		const plaintext: Uint8Array	= await SecretBox.open(
			symmetricCyphertext,
			nonce,
			symmetricKey
		);

		const isValid: boolean		= await OneTimeAuth.verify(
			mac,
			asymmetricCyphertext,
			macKey
		);

		Util.clearMemory(asymmetricPlaintext);

		if (isValid) {
			return plaintext;
		}
		else {
			Util.clearMemory(plaintext);
			throw new Error('Invalid RSA cyphertext.');
		}
	}
}
