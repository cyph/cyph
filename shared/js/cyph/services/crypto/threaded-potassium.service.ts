import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
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
import {EnvService} from '../env.service';
import {LocalStorageService} from '../local-storage.service';
import {WorkerService} from '../worker.service';

/**
 * Potassium wrapper that offloads computationally expensive operations to a separate thread.
 */
@Injectable()
export class ThreadedPotassiumService extends PotassiumUtil
	implements IPotassium {
	/** Returns flattened proxy for a Potassium object inside a worker. */
	private readonly potassiumInternal = memoize(async (_I: number) =>
		this.workerService
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
									[`${k}${k2[0].toUpperCase()}${k2.slice(
										1
									)}`]:
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
			.then(async thread => thread.api)
	);

	/** @ignore */
	private roundRobinIndex: number = 0;

	/** @ignore */
	private readonly roundRobinMax: number = 4;

	/** Default Potassium thread to use when it doesn't matter which one we pick. */
	private readonly staticValues = this.potassium();

	/** @inheritDoc */
	public readonly box: IBox = {
		keyPair: async () => (await this.potassium()).boxKeyPair(),
		open: async (cyphertext, keyPair) =>
			(await this.potassium()).boxOpen(cyphertext, keyPair),
		privateKeyBytes: this.staticValues.then(async o =>
			o.boxPrivateKeyBytes()
		),
		publicKeyBytes: this.staticValues.then(async o =>
			o.boxPublicKeyBytes()
		),
		seal: async (plaintext, publicKey) =>
			(await this.potassium()).boxSeal(plaintext, publicKey)
	};

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: IEphemeralKeyExchange = {
		aliceKeyPair: async () =>
			(await this.potassium()).ephemeralKeyExchangeAliceKeyPair(),
		aliceSecret: async (publicKey, privateKey) =>
			(await this.potassium()).ephemeralKeyExchangeAliceSecret(
				publicKey,
				privateKey
			),
		bobSecret: async alicePublicKey =>
			(await this.potassium()).ephemeralKeyExchangeBobSecret(
				alicePublicKey
			),
		privateKeyBytes: this.staticValues.then(async o =>
			o.ephemeralKeyExchangePrivateKeyBytes()
		),
		publicKeyBytes: this.staticValues.then(async o =>
			o.ephemeralKeyExchangePublicKeyBytes()
		),
		secretBytes: this.staticValues.then(async o =>
			o.ephemeralKeyExchangeSecretBytes()
		)
	};

	/** @inheritDoc */
	public readonly hash: IHash = {
		bytes: this.staticValues.then(async o => o.hashBytes()),
		deriveKey: async (input, outputBytes, clearInput) => {
			const output = (await this.potassium()).hashDeriveKey(
				input,
				outputBytes
			);

			if (clearInput && input instanceof Uint8Array) {
				this.clearMemory(input);
			}

			return output;
		},
		hash: async plaintext => (await this.potassium()).hashHash(plaintext)
	};

	/** @inheritDoc */
	public readonly oneTimeAuth: IOneTimeAuth = {
		bytes: this.staticValues.then(async o => o.oneTimeAuthBytes()),
		keyBytes: this.staticValues.then(async o => o.oneTimeAuthKeyBytes()),
		sign: async (message, key) =>
			(await this.potassium()).oneTimeAuthSign(message, key),
		verify: async (mac, message, key) =>
			(await this.potassium()).oneTimeAuthVerify(mac, message, key)
	};

	/** @inheritDoc */
	public readonly passwordHash: IPasswordHash = {
		algorithm: this.staticValues.then(async o => o.passwordHashAlgorithm()),
		hash: async (
			plaintext,
			salt,
			outputBytes,
			opsLimit,
			memLimit,
			clearInput
		) => {
			const output = (await this.potassium()).passwordHashHash(
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
		},
		memLimitInteractive: this.staticValues.then(async o =>
			o.passwordHashMemLimitInteractive()
		),
		memLimitSensitive: this.staticValues.then(async o =>
			o.passwordHashMemLimitSensitive()
		),
		opsLimitInteractive: this.staticValues.then(async o =>
			o.passwordHashOpsLimitInteractive()
		),
		opsLimitSensitive: this.staticValues.then(async o =>
			o.passwordHashOpsLimitSensitive()
		),
		parseMetadata: async metadata =>
			(await this.potassium()).passwordHashParseMetadata(metadata),
		saltBytes: this.staticValues.then(async o => o.passwordHashSaltBytes())
	};

	/** @inheritDoc */
	public readonly secretBox: ISecretBox = {
		aeadBytes: this.staticValues.then(async o => o.secretBoxAeadBytes()),
		keyBytes: this.staticValues.then(async o => o.secretBoxKeyBytes()),
		open: async (cyphertext, key, additionalData) =>
			this.localStorageService.getOrSetDefault(
				this.secretBoxCacheKey(cyphertext, additionalData),
				BinaryProto,
				async () =>
					(await this.potassium()).secretBoxOpen(
						cyphertext,
						key,
						additionalData
					)
			),
		seal: async (plaintext, key, additionalData) => {
			const cyphertext: Uint8Array = (await this.potassium()).secretBoxSeal(
				plaintext,
				key,
				additionalData
			);

			const cacheKey = this.secretBoxCacheKey(cyphertext, additionalData);

			if (cacheKey !== undefined) {
				this.localStorageService.setItem(
					cacheKey,
					BinaryProto,
					cyphertext
				);
			}

			return cyphertext;
		}
	};

	/** @inheritDoc */
	public readonly sign: ISign = {
		bytes: this.staticValues.then(async o => o.signBytes()),
		importSuperSphincsPublicKeys: async (rsa, sphincs) =>
			(await this.potassium()).signImportSuperSphincsPublicKeys(
				rsa,
				sphincs
			),
		keyPair: async () => (await this.potassium()).signKeyPair(),
		open: async (signed, publicKey, additionalData, decompress) =>
			(await this.potassium()).signOpen(
				signed,
				publicKey,
				additionalData,
				decompress
			),
		privateKeyBytes: this.staticValues.then(async o =>
			o.signPrivateKeyBytes()
		),
		publicKeyBytes: this.staticValues.then(async o =>
			o.signPublicKeyBytes()
		),
		sign: async (message, privateKey, additionalData, compress) =>
			(await this.potassium()).signSign(
				message,
				privateKey,
				additionalData,
				compress
			),
		signDetached: async (message, privateKey, additionalData) =>
			(await this.potassium()).signSignDetached(
				message,
				privateKey,
				additionalData
			),
		verifyDetached: async (signature, message, publicKey, additionalData) =>
			(await this.potassium()).signVerifyDetached(
				signature,
				message,
				publicKey,
				additionalData
			)
	};

	/** Potassium thread pool (round robin load balanced for now). */
	private async potassium () : Promise<any> {
		this.roundRobinIndex =
			this.roundRobinIndex >= this.roundRobinMax ?
				0 :
				this.roundRobinIndex + 1;

		return this.potassiumInternal(this.roundRobinIndex);
	}

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
