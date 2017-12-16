import {sodium} from 'libsodium';
import {mceliece} from 'mceliece';
import {ntru} from 'ntru';
import {IKeyPair} from '../../proto';
import {retryUntilSuccessful} from '../../util/wait';
import {IBox} from './ibox';
import {IOneTimeAuth} from './ione-time-auth';
import {ISecretBox} from './isecret-box';
import * as NativeCrypto from './native-crypto';
import {potassiumUtil} from './potassium-util';


/** @inheritDoc */
export class Box implements IBox {
	/** @ignore */
	private readonly classicalCypher	= {
		decrypt: this.isNative ?
			async (cyphertext: Uint8Array, keyPair: IKeyPair) =>
				NativeCrypto.box.open(cyphertext, keyPair)
			:
			async (cyphertext: Uint8Array, keyPair: IKeyPair) => sodium.ready.then(() =>
				sodium.crypto_box_curve25519xchacha20poly1305_seal_open(
					cyphertext,
					keyPair.publicKey,
					keyPair.privateKey
				)
			)
		,

		encrypt: this.isNative ?
			async (plaintext: Uint8Array, publicKey: Uint8Array) =>
				NativeCrypto.box.seal(plaintext, publicKey)
			:
			async (plaintext: Uint8Array, publicKey: Uint8Array) => sodium.ready.then(() =>
				sodium.crypto_box_curve25519xchacha20poly1305_seal(plaintext, publicKey)
			)
		,

		keyPair: this.isNative ?
			async () => NativeCrypto.box.keyPair() :
			async () => sodium.ready.then(() =>
				sodium.crypto_box_curve25519xchacha20poly1305_keypair()
			)
		,

		nonceBytes: sodium.ready.then(() => this.isNative ?
			NativeCrypto.secretBox.nonceBytes :
			sodium.crypto_box_curve25519xchacha20poly1305_NONCEBYTES
		),

		privateKeyBytes: sodium.ready.then(() => this.isNative ?
			NativeCrypto.box.privateKeyBytes :
			sodium.crypto_box_curve25519xchacha20poly1305_SECRETKEYBYTES
		),

		publicKeyBytes: sodium.ready.then(() => this.isNative ?
			NativeCrypto.box.publicKeyBytes :
			sodium.crypto_box_curve25519xchacha20poly1305_PUBLICKEYBYTES
		)
	};

	/** @inheritDoc */
	public readonly privateKeyBytes: Promise<number>	= (async () =>
		(await mceliece.privateKeyBytes) +
		(await ntru.privateKeyBytes) +
		(await this.classicalCypher.privateKeyBytes)
	)();

	/** @inheritDoc */
	public readonly publicKeyBytes: Promise<number>		= (async () =>
		(await mceliece.publicKeyBytes) +
		(await ntru.publicKeyBytes) +
		(await this.classicalCypher.publicKeyBytes)
	)();

	/** @ignore */
	private async publicKeyDecrypt<SK extends IKeyPair|Uint8Array> (
		cyphertext: Uint8Array,
		privateKey: SK,
		cypher: {decrypt: (cyphertext: Uint8Array, keyPair: SK) => Promise<Uint8Array>},
		name: string,
		clearCyphertext: boolean = true
	) : Promise<Uint8Array> {
		const oneTimeAuthBytes		= await this.oneTimeAuth.bytes;
		const oneTimeAuthKeyBytes	= await this.oneTimeAuth.keyBytes;

		try {
			const [asymmetricCyphertext, symmetricCyphertext]	= potassiumUtil.splitBytes(cyphertext);

			const mac			= potassiumUtil.toBytes(asymmetricCyphertext, 0, oneTimeAuthBytes);
			const encrypted		= potassiumUtil.toBytes(asymmetricCyphertext, oneTimeAuthBytes);
			const decrypted		= await cypher.decrypt(encrypted, privateKey);
			const authKey		= potassiumUtil.toBytes(decrypted, 0, oneTimeAuthKeyBytes);
			const symmetricKey	= potassiumUtil.toBytes(decrypted, oneTimeAuthKeyBytes);
			const isValid		= await this.oneTimeAuth.verify(mac, encrypted, authKey);

			try {
				if (!isValid) {
					throw new Error(`${name} auth validation failed.`);
				}

				return await this.secretBox.open(symmetricCyphertext, symmetricKey);
			}
			finally {
				potassiumUtil.clearMemory(decrypted);
			}
		}
		catch (err) {
			throw new Error(`${name} decryption error: ${err ? err.message : 'undefined'}`);
		}
		finally {
			if (clearCyphertext) {
				potassiumUtil.clearMemory(cyphertext);
			}
		}
	}

	/** @ignore */
	private async publicKeyEncrypt (
		plaintext: Uint8Array,
		publicKey: Uint8Array,
		cypher: {encrypt: (plaintext: Uint8Array, publicKey: Uint8Array) => Promise<Uint8Array>},
		name: string,
		clearPlaintext: boolean = true
	) : Promise<Uint8Array> {
		const oneTimeAuthKeyBytes	= await this.oneTimeAuth.keyBytes;
		const secretBoxKeyBytes		= await this.secretBox.keyBytes;

		try {
			const asymmetricPlaintext	= potassiumUtil.randomBytes(oneTimeAuthKeyBytes + secretBoxKeyBytes);

			const symmetricKey			= potassiumUtil.toBytes(asymmetricPlaintext, oneTimeAuthKeyBytes);
			const symmetricCyphertext	= await this.secretBox.seal(plaintext, symmetricKey);

			const authKey				= potassiumUtil.toBytes(asymmetricPlaintext, 0, oneTimeAuthKeyBytes);
			const encrypted				= await cypher.encrypt(asymmetricPlaintext, publicKey);
			const mac					= await this.oneTimeAuth.sign(encrypted, authKey);
			const asymmetricCyphertext	= potassiumUtil.concatMemory(true, mac, encrypted);

			potassiumUtil.clearMemory(asymmetricPlaintext);

			return potassiumUtil.joinBytes(asymmetricCyphertext, symmetricCyphertext);
		}
		catch (err) {
			throw new Error(`${name} encryption error: ${err ? err.message : 'undefined'}`);
		}
		finally {
			if (clearPlaintext) {
				potassiumUtil.clearMemory(plaintext);
			}
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
				0,
				await this.classicalCypher.privateKeyBytes
			),
			mceliece: potassiumUtil.toBytes(
				privateKey,
				await this.classicalCypher.privateKeyBytes,
				await mceliece.privateKeyBytes
			),
			ntru: potassiumUtil.toBytes(
				privateKey,
				(await this.classicalCypher.privateKeyBytes) + (await mceliece.privateKeyBytes),
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
				0,
				await this.classicalCypher.publicKeyBytes
			),
			mceliece: potassiumUtil.toBytes(
				publicKey,
				await this.classicalCypher.publicKeyBytes,
				await mceliece.publicKeyBytes
			),
			ntru: potassiumUtil.toBytes(
				publicKey,
				(await this.classicalCypher.publicKeyBytes) + (await mceliece.publicKeyBytes),
				await ntru.publicKeyBytes
			)
		};
	}

	/** @inheritDoc */
	public async keyPair () : Promise<IKeyPair> {
		return retryUntilSuccessful(async () => {
			const keyPairs	= {
				classical: await this.classicalCypher.keyPair(),
				mceliece: await mceliece.keyPair(),
				ntru: await ntru.keyPair()
			};

			const keyPair	= {
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

			const testInput	= potassiumUtil.randomBytes(32);
			if (!potassiumUtil.compareMemory(
				testInput,
				await this.open(
					await this.seal(testInput, keyPair.publicKey),
					keyPair
				)
			)) {
				throw new Error('Corrupt Potassium.Box key.');
			}

			return keyPair;
		});
	}

	/** @inheritDoc */
	public async open (cyphertext: Uint8Array, keyPair: IKeyPair) : Promise<Uint8Array> {
		const privateSubKeys	= await this.splitPrivateKey(keyPair.privateKey);
		const publicSubKeys		= await this.splitPublicKey(keyPair.publicKey);

		return this.publicKeyDecrypt(
			await this.publicKeyDecrypt(
				await this.publicKeyDecrypt(
					cyphertext,
					privateSubKeys.ntru,
					ntru,
					'NTRU',
					false
				),
				privateSubKeys.mceliece,
				mceliece,
				'McEliece'
			),
			{privateKey: privateSubKeys.classical, publicKey: publicSubKeys.classical},
			this.classicalCypher,
			'Classical'
		);
	}

	/** @inheritDoc */
	public async seal (plaintext: Uint8Array, publicKey: Uint8Array) : Promise<Uint8Array> {
		const publicSubKeys	= await this.splitPublicKey(publicKey);

		return this.publicKeyEncrypt(
			await this.publicKeyEncrypt(
				await this.publicKeyEncrypt(
					plaintext,
					publicSubKeys.classical,
					this.classicalCypher,
					'Classical',
					false
				),
				publicSubKeys.mceliece,
				mceliece,
				'McEliece'
			),
			publicSubKeys.ntru,
			ntru,
			'NTRU'
		);
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean,

		/** @ignore */
		private readonly oneTimeAuth: IOneTimeAuth,

		/** @ignore */
		private readonly secretBox: ISecretBox
	) {}
}
