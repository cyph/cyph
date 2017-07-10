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
	private async publicKeyDecrypt (
		keyCyphertext: Uint8Array,
		privateKey: Uint8Array,
		name: string,
		encryptedKeyBytes: number,
		cipher: {decrypt: (cyphertext: Uint8Array, privateKey: Uint8Array) => Promise<Uint8Array>}
	) : Promise<{
		innerKeys: Uint8Array;
		symmetricKey: Uint8Array;
	}> {
		const oneTimeAuthBytes		= await this.oneTimeAuth.bytes;
		const oneTimeAuthKeyBytes	= await this.oneTimeAuth.keyBytes;
		const secretBoxKeyBytes		= await this.secretBox.keyBytes;

		try {
			const encryptedKeys	= potassiumUtil.toBytes(
				keyCyphertext,
				undefined,
				encryptedKeyBytes
			);

			const mac			= potassiumUtil.toBytes(
				keyCyphertext,
				encryptedKeyBytes,
				oneTimeAuthBytes
			);

			const innerKeys		= await cipher.decrypt(
				encryptedKeys,
				privateKey
			);

			const symmetricKey	= potassiumUtil.toBytes(
				innerKeys,
				undefined,
				secretBoxKeyBytes
			);

			const authKey		= potassiumUtil.toBytes(
				innerKeys,
				secretBoxKeyBytes,
				oneTimeAuthKeyBytes
			);

			const isValid		= await this.oneTimeAuth.verify(
				mac,
				encryptedKeys,
				authKey
			);

			if (!isValid) {
				potassiumUtil.clearMemory(innerKeys);
				throw new Error('One-time auth verification failed.');
			}

			return {innerKeys, symmetricKey};
		}
		catch (err) {
			throw new Error(`${name} decryption error: ${err ? err.message : 'undefined'}`);
		}
	}

	/** @ignore */
	private async publicKeyEncrypt (
		publicKey: Uint8Array,
		name: string,
		plaintextBytes: number,
		cipher: {encrypt: (plaintext: Uint8Array, publicKey: Uint8Array) => Promise<Uint8Array>}
	) : Promise<{
		innerKeys: Uint8Array;
		keyCyphertext: Uint8Array;
		symmetricKey: Uint8Array;
	}> {
		const oneTimeAuthKeyBytes	= await this.oneTimeAuth.keyBytes;
		const secretBoxKeyBytes		= await this.secretBox.keyBytes;

		if (plaintextBytes < (secretBoxKeyBytes + oneTimeAuthKeyBytes)) {
			throw new Error(`Not enough space for keys; must increase ${name} parameters.`);
		}

		try {
			const innerKeys		= potassiumUtil.randomBytes(plaintextBytes);

			const symmetricKey	= potassiumUtil.toBytes(
				innerKeys,
				undefined,
				secretBoxKeyBytes
			);

			const authKey		= potassiumUtil.toBytes(
				innerKeys,
				secretBoxKeyBytes,
				oneTimeAuthKeyBytes
			);

			const encryptedKeys	= await cipher.encrypt(
				innerKeys,
				publicKey
			);

			const mac			= await this.oneTimeAuth.sign(
				encryptedKeys,
				authKey
			);

			return {
				innerKeys,
				keyCyphertext: potassiumUtil.concatMemory(
					true,
					encryptedKeys,
					mac
				),
				symmetricKey
			};
		}
		catch (err) {
			throw new Error(`${name} encryption error: ${err ? err.message : 'undefined'}`);
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
				this.helpers.privateKeyBytes + (await mceliece.privateKeyBytes),
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
				this.helpers.publicKeyBytes + (await mceliece.publicKeyBytes),
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
		const oneTimeAuthBytes		= await this.oneTimeAuth.bytes;

		const privateSubKeys		= await this.splitPrivateKey(keyPair.privateKey);
		const publicSubKeys			= await this.splitPublicKey(keyPair.publicKey);

		let cyphertextIndex			= 0;

		const mcelieceData			= await this.publicKeyDecrypt(
			potassiumUtil.toBytes(
				cyphertext,
				cyphertextIndex,
				(await mceliece.cyphertextBytes) + oneTimeAuthBytes
			),
			privateSubKeys.mceliece,
			'McEliece',
			await mceliece.cyphertextBytes,
			mceliece
		);

		cyphertextIndex += (await mceliece.cyphertextBytes) + oneTimeAuthBytes;

		const ntruData				= await this.publicKeyDecrypt(
			potassiumUtil.toBytes(
				cyphertext,
				cyphertextIndex,
				(await ntru.cyphertextBytes) + oneTimeAuthBytes
			),
			privateSubKeys.ntru,
			'NTRU',
			await ntru.cyphertextBytes,
			ntru
		);

		cyphertextIndex += (await ntru.cyphertextBytes) + oneTimeAuthBytes;

		const nonce					= potassiumUtil.toBytes(
			cyphertext,
			cyphertextIndex,
			this.helpers.nonceBytes
		);

		cyphertextIndex += this.helpers.nonceBytes;

		const mcelieceCyphertext	= potassiumUtil.toBytes(
			cyphertext,
			cyphertextIndex
		);
		const ntruCyphertext		= await this.secretBox.open(
			mcelieceCyphertext,
			mcelieceData.symmetricKey
		);
		const classicalCyphertext	= await this.secretBox.open(
			ntruCyphertext,
			ntruData.symmetricKey
		);

		const plaintext				= await this.helpers.open(
			classicalCyphertext,
			nonce,
			{
				privateKey: privateSubKeys.classical,
				publicKey: publicSubKeys.classical
			}
		);

		potassiumUtil.clearMemory(mcelieceData.innerKeys);
		potassiumUtil.clearMemory(ntruData.innerKeys);
		potassiumUtil.clearMemory(ntruCyphertext);
		potassiumUtil.clearMemory(classicalCyphertext);

		return plaintext;
	}

	/** @inheritDoc */
	public async seal (plaintext: Uint8Array, publicKey: Uint8Array) : Promise<Uint8Array> {
		const publicSubKeys			= await this.splitPublicKey(publicKey);

		const mcelieceData			= await this.publicKeyEncrypt(
			publicSubKeys.mceliece,
			'McEliece',
			await mceliece.plaintextBytes,
			mceliece
		);

		const ntruData				= await this.publicKeyEncrypt(
			publicSubKeys.ntru,
			'NTRU',
			await ntru.plaintextBytes,
			ntru
		);

		const nonce					= potassiumUtil.randomBytes(
			this.helpers.nonceBytes
		);

		const classicalCyphertext	= await this.helpers.seal(
			plaintext,
			nonce,
			publicSubKeys.classical
		);
		const ntruCyphertext		= await this.secretBox.seal(
			classicalCyphertext,
			ntruData.symmetricKey
		);
		const mcelieceCyphertext	= await this.secretBox.seal(
			ntruCyphertext,
			mcelieceData.symmetricKey
		);

		potassiumUtil.clearMemory(ntruData.innerKeys);
		potassiumUtil.clearMemory(mcelieceData.innerKeys);

		return potassiumUtil.concatMemory(
			true,
			mcelieceData.keyCyphertext,
			ntruData.keyCyphertext,
			nonce,
			mcelieceCyphertext
		);
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
