import {Injectable} from '@angular/core';
import {IBox} from '../../crypto/potassium/ibox';
import {IEphemeralKeyExchange} from '../../crypto/potassium/iephemeral-key-exchange';
import {IHash} from '../../crypto/potassium/ihash';
import {IOneTimeAuth} from '../../crypto/potassium/ione-time-auth';
import {IPasswordHash} from '../../crypto/potassium/ipassword-hash';
import {IPotassium} from '../../crypto/potassium/ipotassium';
import {isNativeCryptoSupported} from '../../crypto/potassium/is-native-crypto-supported';
import {ISecretBox} from '../../crypto/potassium/isecret-box';
import {ISign} from '../../crypto/potassium/isign';
import {PotassiumUtil} from '../../crypto/potassium/potassium-util';
import {BinaryProto} from '../../proto';
import {lockFunction} from '../../util/lock';
import {EnvService} from '../env.service';
import {LocalStorageService} from '../local-storage.service';
import {WorkerService} from '../worker.service';

/**
 * Potassium wrapper that offloads computationally expensive operations to a separate thread.
 */
@Injectable()
export class ThreadedPotassiumService extends PotassiumUtil
	implements IPotassium {
	/** @ignore */
	private readonly lock = lockFunction();

	/** Flattened proxy for a Potassium object inside a worker. */
	private readonly potassium = this.workerService
		.createThread<any>(
			/* eslint-disable-next-line prefer-arrow/prefer-arrow-functions */
			function () : void {
				importScripts('/assets/js/cyph/crypto/potassium/index.js');

				const potassium = new (<any> self).Potassium(
					(<any> self).threadLocals.isNative
				);

				(<any> self).Comlink.expose(
					Object.keys(potassium)
						.map(k =>
							Array.from(
								new Set([
									...Object.keys(potassium[k]),
									...Object.keys(potassium[k].__proto__)
								])
							).map(k2 => ({
								[`${k}${k2[0].toUpperCase()}${k2.slice(1)}`]:
									typeof potassium[k][k2] === 'function' ?
										(...args: any[]) =>
											potassium[k][k2](...args) :
										() => potassium[k][k2]
							}))
						)
						.reduce((a, b) => [...a, ...b])
						.reduce((a, b) => {
							for (const k3 of Object.keys(b)) {
								a[k3] = b[k3];
							}

							return a;
						}, {}),
					self
				);
			},
			(async () => ({
				isNative: await this.native()
			}))()
		)
		.then(async thread => thread.api);

	/** @inheritDoc */
	public readonly box: IBox = {
		keyPair: async () =>
			this.lock(async () => (await this.potassium).boxKeyPair()),
		open: async (cyphertext, keyPair) =>
			this.lock(async () =>
				(await this.potassium).boxOpen(cyphertext, keyPair)
			),
		privateKeyBytes: this.potassium.then(async o => o.boxPrivateKeyBytes()),
		publicKeyBytes: this.potassium.then(async o => o.boxPublicKeyBytes()),
		seal: async (plaintext, publicKey) =>
			this.lock(async () =>
				(await this.potassium).boxSeal(plaintext, publicKey)
			)
	};

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: IEphemeralKeyExchange = {
		aliceKeyPair: async () =>
			this.lock(async () =>
				(await this.potassium).ephemeralKeyExchangeAliceKeyPair()
			),
		aliceSecret: async (publicKey, privateKey) =>
			this.lock(async () =>
				(await this.potassium).ephemeralKeyExchangeAliceSecret(
					publicKey,
					privateKey
				)
			),
		bobSecret: async alicePublicKey =>
			this.lock(async () =>
				(await this.potassium).ephemeralKeyExchangeBobSecret(
					alicePublicKey
				)
			),
		privateKeyBytes: this.potassium.then(async o =>
			o.ephemeralKeyExchangePrivateKeyBytes()
		),
		publicKeyBytes: this.potassium.then(async o =>
			o.ephemeralKeyExchangePublicKeyBytes()
		),
		secretBytes: this.potassium.then(async o =>
			o.ephemeralKeyExchangeSecretBytes()
		)
	};

	/** @inheritDoc */
	public readonly hash: IHash = {
		bytes: this.potassium.then(async o => o.hashBytes()),
		deriveKey: async (input, outputBytes, clearInput) =>
			this.lock(async () => {
				const output = (await this.potassium).hashDeriveKey(
					input,
					outputBytes
				);

				if (clearInput && input instanceof Uint8Array) {
					this.clearMemory(input);
				}

				return output;
			}),
		hash: async plaintext =>
			this.lock(async () => (await this.potassium).hashHash(plaintext))
	};

	/** @inheritDoc */
	public readonly oneTimeAuth: IOneTimeAuth = {
		bytes: this.potassium.then(async o => o.oneTimeAuthBytes()),
		keyBytes: this.potassium.then(async o => o.oneTimeAuthKeyBytes()),
		sign: async (message, key) =>
			this.lock(async () =>
				(await this.potassium).oneTimeAuthSign(message, key)
			),
		verify: async (mac, message, key) =>
			this.lock(async () =>
				(await this.potassium).oneTimeAuthVerify(mac, message, key)
			)
	};

	/** @inheritDoc */
	public readonly passwordHash: IPasswordHash = {
		algorithm: this.potassium.then(async o => o.passwordHashAlgorithm()),
		hash: async (
			plaintext,
			salt,
			outputBytes,
			opsLimit,
			memLimit,
			clearInput
		) =>
			this.lock(async () => {
				const output = (await this.potassium).passwordHashHash(
					plaintext,
					salt,
					outputBytes,
					opsLimit,
					memLimit
				);

				if (clearInput && plaintext instanceof Uint8Array) {
					this.clearMemory(plaintext);
				}
				if (clearInput && salt instanceof Uint8Array) {
					this.clearMemory(salt);
				}

				return output;
			}),
		memLimitInteractive: this.potassium.then(async o =>
			o.passwordHashMemLimitInteractive()
		),
		memLimitSensitive: this.potassium.then(async o =>
			o.passwordHashMemLimitSensitive()
		),
		opsLimitInteractive: this.potassium.then(async o =>
			o.passwordHashOpsLimitInteractive()
		),
		opsLimitSensitive: this.potassium.then(async o =>
			o.passwordHashOpsLimitSensitive()
		),
		parseMetadata: async metadata =>
			this.lock(async () =>
				(await this.potassium).passwordHashParseMetadata(metadata)
			),
		saltBytes: this.potassium.then(async o => o.passwordHashSaltBytes())
	};

	/** @inheritDoc */
	public readonly secretBox: ISecretBox = {
		aeadBytes: this.potassium.then(async o => o.secretBoxAeadBytes()),
		keyBytes: this.potassium.then(async o => o.secretBoxKeyBytes()),
		open: async (cyphertext, key, additionalData) =>
			this.localStorageService.getOrSetDefault(
				this.secretBoxCacheKey(cyphertext, additionalData),
				BinaryProto,
				async () =>
					this.lock(async () =>
						(await this.potassium).secretBoxOpen(
							cyphertext,
							key,
							additionalData
						)
					)
			),
		seal: async (plaintext, key, additionalData) =>
			this.lock(async () => {
				const cyphertext: Uint8Array = (await this
					.potassium).secretBoxSeal(plaintext, key, additionalData);

				const cacheKey = this.secretBoxCacheKey(
					cyphertext,
					additionalData
				);

				if (cacheKey !== undefined) {
					this.localStorageService.setItem(
						cacheKey,
						BinaryProto,
						cyphertext
					);
				}

				return cyphertext;
			})
	};

	/** @inheritDoc */
	public readonly sign: ISign = {
		bytes: this.potassium.then(async o => o.signBytes()),
		importSuperSphincsPublicKeys: async (rsa, sphincs) =>
			this.lock(async () =>
				(await this.potassium).signImportSuperSphincsPublicKeys(
					rsa,
					sphincs
				)
			),
		keyPair: async () =>
			this.lock(async () => (await this.potassium).signKeyPair()),
		open: async (signed, publicKey, additionalData, decompress) =>
			this.lock(async () =>
				(await this.potassium).signOpen(
					signed,
					publicKey,
					additionalData,
					decompress
				)
			),
		privateKeyBytes: this.potassium.then(async o =>
			o.signPrivateKeyBytes()
		),
		publicKeyBytes: this.potassium.then(async o => o.signPublicKeyBytes()),
		sign: async (message, privateKey, additionalData, compress) =>
			this.lock(async () =>
				(await this.potassium).signSign(
					message,
					privateKey,
					additionalData,
					compress
				)
			),
		signDetached: async (message, privateKey, additionalData) =>
			this.lock(async () =>
				(await this.potassium).signSignDetached(
					message,
					privateKey,
					additionalData
				)
			),
		verifyDetached: async (signature, message, publicKey, additionalData) =>
			this.lock(async () =>
				(await this.potassium).signVerifyDetached(
					signature,
					message,
					publicKey,
					additionalData
				)
			)
	};

	/** Returns cache key for caching SecretBox results. */
	private secretBoxCacheKey (
		cyphertext: Uint8Array,
		additionalData: string | Uint8Array | undefined
	) : string | undefined {
		if (cyphertext.length > 1048576) {
			return undefined;
		}

		return `ThreadedPotassiumService.secretBox\n${this.toHex(cyphertext)}${
			additionalData !== undefined ?
				`\n${this.toHex(additionalData)}` :
				''
		}`;
	}

	/** @inheritDoc */
	public async isNativeCryptoSupported () : Promise<boolean> {
		return isNativeCryptoSupported();
	}

	/** @inheritDoc */
	public async native () : Promise<boolean> {
		return !!this.envService.environment.customBuild?.config.nativeCrypto;
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super();
	}
}
