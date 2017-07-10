import {sodium} from 'libsodium';
import {mceliece} from 'mceliece';
import {ntru} from 'ntru';
import {IKeyPair} from '../../../proto';
import {IBox} from './ibox';
import * as NativeCrypto from './native-crypto';
import {OneTimeAuth} from './one-time-auth';
import {potassiumUtil} from './potassium-util';
import {SecretBox} from './secret-box';


/** @inheritDoc */
export class Box implements IBox {
	/** @ignore */
	private readonly classicalCypher	= {
		decrypt: async (cyphertext: Uint8Array, keyPair: IKeyPair) => {
			return this.helpers.open(
				potassiumUtil.toBytes(cyphertext, this.helpers.nonceBytes),
				potassiumUtil.toBytes(cyphertext, undefined, this.helpers.nonceBytes),
				keyPair
			);
		},
		encrypt: async (plaintext: Uint8Array, publicKey: Uint8Array) => {
			const nonce			= potassiumUtil.randomBytes(this.helpers.nonceBytes);
			const cyphertext	= await this.helpers.seal(plaintext, nonce, publicKey);
			return potassiumUtil.concatMemory(true, nonce, cyphertext);
		}
	};

	/** @ignore */
	private readonly helpers: {
		keyPair: () => Promise<IKeyPair>;
		nonceBytes: number;
		open: (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			keyPair: IKeyPair
		) => Promise<Uint8Array>;
		privateKeyBytes: number;
		publicKeyBytes: number;
		seal: (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array
		) => Promise<Uint8Array>;
	}	= {
		keyPair: async () : Promise<IKeyPair> =>
			this.isNative ?
				NativeCrypto.box.keyPair() :
				sodium.crypto_box_curve25519xchacha20poly1305_keypair()
		,

		nonceBytes:
			this.isNative ?
				NativeCrypto.secretBox.nonceBytes :
				sodium.crypto_box_curve25519xchacha20poly1305_NONCEBYTES
		,

		open: async (
			cyphertext: Uint8Array,
			nonce: Uint8Array,
			keyPair: IKeyPair
		) : Promise<Uint8Array> =>
			this.isNative ?
				NativeCrypto.box.open(
					cyphertext,
					nonce,
					keyPair
				) :
				sodium.crypto_box_curve25519xchacha20poly1305_seal_open(
					cyphertext,
					keyPair.publicKey,
					keyPair.privateKey
				)
		,

		privateKeyBytes:
			this.isNative ?
				NativeCrypto.box.privateKeyBytes :
				sodium.crypto_box_curve25519xchacha20poly1305_SECRETKEYBYTES
		,

		publicKeyBytes:
			this.isNative ?
				NativeCrypto.box.publicKeyBytes :
				sodium.crypto_box_curve25519xchacha20poly1305_PUBLICKEYBYTES
		,

		seal: async (
			plaintext: Uint8Array,
			nonce: Uint8Array,
			publicKey: Uint8Array
		) : Promise<Uint8Array> =>
			this.isNative ?
				NativeCrypto.box.seal(
					plaintext,
					nonce,
					publicKey
				) :
				sodium.crypto_box_curve25519xchacha20poly1305_seal(
					plaintext,
					publicKey
				)
	};

	/** @inheritDoc */
	public readonly privateKeyBytes: Promise<number>	= (async () =>
		(await mceliece.privateKeyBytes) +
		(await ntru.privateKeyBytes) +
		this.helpers.privateKeyBytes
	)();

	/** @inheritDoc */
	public readonly publicKeyBytes: Promise<number>		= (async () =>
		(await mceliece.publicKeyBytes) +
		(await ntru.publicKeyBytes) +
		this.helpers.publicKeyBytes
	)();

	/** @ignore */
	private async publicKeyDecrypt<SK extends IKeyPair|Uint8Array> (
		cyphertext: Uint8Array,
		privateKey: SK,
		cypher: {decrypt: (cyphertext: Uint8Array, keyPair: SK) => Promise<Uint8Array>},
		name: string
	) : Promise<Uint8Array> {
		const oneTimeAuthBytes		= await this.oneTimeAuth.bytes;
		const oneTimeAuthKeyBytes	= await this.oneTimeAuth.keyBytes;

		try {
			const mac		= potassiumUtil.toBytes(cyphertext, undefined, oneTimeAuthBytes);
			const encrypted	= potassiumUtil.toBytes(cyphertext, oneTimeAuthBytes);
			const decrypted	= await cypher.decrypt(encrypted, privateKey);
			const authKey	= potassiumUtil.toBytes(decrypted, undefined, oneTimeAuthKeyBytes);
			const plaintext	= potassiumUtil.toBytes(decrypted, oneTimeAuthKeyBytes);
			const isValid	= await this.oneTimeAuth.verify(mac, encrypted, authKey);

			potassiumUtil.clearMemory(authKey);

			if (!isValid) {
				potassiumUtil.clearMemory(plaintext);
				throw new Error(`${name} auth validation failed.`);
			}

			return plaintext;
		}
		catch (err) {
			throw new Error(`${name} decryption error: ${err ? err.message : 'undefined'}`);
		}
		finally {
			potassiumUtil.clearMemory(cyphertext);
		}
	}

	/** @ignore */
	private async publicKeyEncrypt (
		plaintext: Uint8Array,
		publicKey: Uint8Array,
		cypher: {
			encrypt: (plaintext: Uint8Array, publicKey: Uint8Array) => Promise<Uint8Array>;
			plaintextBytes?: Promise<number>;
		},
		name: string
	) : Promise<Uint8Array> {
		const oneTimeAuthKeyBytes	= await this.oneTimeAuth.keyBytes;

		if (
			cypher.plaintextBytes &&
			(await cypher.plaintextBytes) < (plaintext.length + oneTimeAuthKeyBytes)
		) {
			throw new Error(`Not enough space for keys; must increase ${name} parameters.`);
		}

		try {
			const authKey	= potassiumUtil.randomBytes(oneTimeAuthKeyBytes);

			const encrypted	= await cypher.encrypt(
				potassiumUtil.concatMemory(false, authKey, plaintext),
				publicKey
			);

			const mac		= await this.oneTimeAuth.sign(encrypted, authKey);

			potassiumUtil.clearMemory(authKey);

			return potassiumUtil.concatMemory(true, mac, encrypted);
		}
		catch (err) {
			throw new Error(`${name} encryption error: ${err ? err.message : 'undefined'}`);
		}
		finally {
			potassiumUtil.clearMemory(plaintext);
		}
	}

	/** @ignore */
	private async splitPrivateKey (privateKey: Uint8Array) : Promise<{
		classical: Uint8Array;
		mceliece: Uint8Array;
		ntru: Uint8Array;
	}> {
		return {
			classical: potassiumUtil.toBytes(
				privateKey,
				undefined,
				this.helpers.privateKeyBytes
			),
			mceliece: potassiumUtil.toBytes(
				privateKey,
				this.helpers.privateKeyBytes,
				await mceliece.privateKeyBytes
			),
			ntru: potassiumUtil.toBytes(
				privateKey,
				this.helpers.privateKeyBytes + await mceliece.privateKeyBytes,
				await ntru.privateKeyBytes
			)
		};
	}

	/** @ignore */
	private async splitPublicKey (publicKey: Uint8Array) : Promise<{
		classical: Uint8Array;
		mceliece: Uint8Array;
		ntru: Uint8Array;
	}> {
		return {
			classical: potassiumUtil.toBytes(
				publicKey,
				undefined,
				this.helpers.publicKeyBytes
			),
			mceliece: potassiumUtil.toBytes(
				publicKey,
				this.helpers.publicKeyBytes,
				await mceliece.publicKeyBytes
			),
			ntru: potassiumUtil.toBytes(
				publicKey,
				this.helpers.publicKeyBytes + await mceliece.publicKeyBytes,
				await ntru.publicKeyBytes
			)
		};
	}

	/** @inheritDoc */
	public async keyPair () : Promise<IKeyPair> {
		const keyPairs	= {
			classical: await this.helpers.keyPair(),
			mceliece: await mceliece.keyPair(),
			ntru: await ntru.keyPair()
		};

		return {
			privateKey: potassiumUtil.concatMemory(
				true,
				keyPairs.classical.privateKey,
				keyPairs.mceliece.privateKey,
				keyPairs.ntru.privateKey
			),
			publicKey: potassiumUtil.concatMemory(
				true,
				keyPairs.classical.publicKey,
				keyPairs.mceliece.publicKey,
				keyPairs.ntru.publicKey
			)
		};
	}

	/** @inheritDoc */
	public async open (cyphertext: Uint8Array, keyPair: IKeyPair) : Promise<Uint8Array> {
		const oneTimeAuthBytes			= await this.oneTimeAuth.bytes;
		const asymmetricCyphertextBytes	= oneTimeAuthBytes + await mceliece.cyphertextBytes;

		const privateSubKeys			= await this.splitPrivateKey(keyPair.privateKey);
		const publicSubKeys				= await this.splitPublicKey(keyPair.publicKey);

		const asymmetricCyphertext		= potassiumUtil.toBytes(
			cyphertext,
			undefined,
			asymmetricCyphertextBytes
		);

		const symmetricCyphertext		= potassiumUtil.toBytes(
			cyphertext,
			asymmetricCyphertextBytes
		);

		const symmetricKey				= await this.publicKeyDecrypt(
			await this.publicKeyDecrypt(
				await this.publicKeyDecrypt(
					asymmetricCyphertext,
					privateSubKeys.mceliece,
					mceliece,
					'McEliece'
				),
				privateSubKeys.ntru,
				ntru,
				'NTRU'
			),
			{privateKey: privateSubKeys.classical, publicKey: publicSubKeys.classical},
			this.classicalCypher,
			'Classical'
		);

		try {
			return this.secretBox.open(symmetricCyphertext, symmetricKey);
		}
		finally {
			potassiumUtil.clearMemory(symmetricKey);
		}
	}

	/** @inheritDoc */
	public async seal (plaintext: Uint8Array, publicKey: Uint8Array) : Promise<Uint8Array> {
		const publicSubKeys			= await this.splitPublicKey(publicKey);

		const symmetricKey			= potassiumUtil.randomBytes(await this.secretBox.keyBytes);
		const symmetricCyphertext	= await this.secretBox.seal(plaintext, symmetricKey);

		const asymmetricCyphertext	= await this.publicKeyEncrypt(
			await this.publicKeyEncrypt(
				await this.publicKeyEncrypt(
					symmetricKey,
					publicSubKeys.classical,
					this.classicalCypher,
					'Classical'
				),
				publicSubKeys.ntru,
				ntru,
				'NTRU'
			),
			publicSubKeys.mceliece,
			mceliece,
			'McEliece'
		);

		return potassiumUtil.concatMemory(true, asymmetricCyphertext, symmetricCyphertext);
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean,

		/** @ignore */
		private readonly oneTimeAuth: OneTimeAuth,

		/** @ignore */
		private readonly secretBox: SecretBox
	) {}
}
