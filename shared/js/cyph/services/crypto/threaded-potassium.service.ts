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
	/** Proxy for Potassium.Box inside a worker. */
	private readonly boxThread = memoize(async () => this.getPotassiumThread());

	/** Proxy for Potassium.EphemeralKeyExchange inside a worker. */
	private readonly ephemeralKeyExchangeThread = memoize(async () =>
		this.getPotassiumThread()
	);

	/** Proxy for Potassium.Hash inside a worker. */
	private readonly hashThread = memoize(async () =>
		this.getPotassiumThread()
	);

	/** Proxy for Potassium.OneTimeAuth inside a worker. */
	private readonly oneTimeAuthThread = memoize(async () =>
		this.getPotassiumThread()
	);

	/** Proxy for Potassium.PasswordHash inside a worker. */
	private readonly passwordHashThread = memoize(async () =>
		this.getPotassiumThread()
	);

	/** Proxy for Potassium.SecretBox inside a worker. */
	private readonly secretBoxThread = memoize(async () =>
		this.getPotassiumThread()
	);

	/** Proxy for Potassium.Sign inside a worker. */
	private readonly signThread = memoize(async () =>
		this.getPotassiumThread()
	);

	/** Default Potassium thread to use when it doesn't matter which one we pick. */
	private readonly staticValues = this.secretBoxThread();

	/** @inheritDoc */
	public readonly box: IBox = {
		keyPair: async () => (await this.boxThread()).boxKeyPair(),
		open: async (cyphertext, keyPair) =>
			(await this.boxThread()).boxOpen(cyphertext, keyPair),
		privateKeyBytes: this.staticValues.then(async o =>
			o.boxPrivateKeyBytes()
		),
		publicKeyBytes: this.staticValues.then(async o =>
			o.boxPublicKeyBytes()
		),
		seal: async (plaintext, publicKey) =>
			(await this.boxThread()).boxSeal(plaintext, publicKey)
	};

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: IEphemeralKeyExchange = {
		aliceKeyPair: async () =>
			(await this.ephemeralKeyExchangeThread()).ephemeralKeyExchangeAliceKeyPair(),
		aliceSecret: async (publicKey, privateKey) =>
			(await this.ephemeralKeyExchangeThread()).ephemeralKeyExchangeAliceSecret(
				publicKey,
				privateKey
			),
		bobSecret: async alicePublicKey =>
			(await this.ephemeralKeyExchangeThread()).ephemeralKeyExchangeBobSecret(
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
			const output = (await this.hashThread()).hashDeriveKey(
				input,
				outputBytes
			);

			if (clearInput && input instanceof Uint8Array) {
				this.clearMemory(input);
			}

			return output;
		},
		hash: async plaintext => (await this.hashThread()).hashHash(plaintext)
	};

	/** @inheritDoc */
	public readonly oneTimeAuth: IOneTimeAuth = {
		bytes: this.staticValues.then(async o => o.oneTimeAuthBytes()),
		keyBytes: this.staticValues.then(async o => o.oneTimeAuthKeyBytes()),
		sign: async (message, key) =>
			(await this.oneTimeAuthThread()).oneTimeAuthSign(message, key),
		verify: async (mac, message, key) =>
			(await this.oneTimeAuthThread()).oneTimeAuthVerify(
				mac,
				message,
				key
			)
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
			const output = (await this.passwordHashThread()).passwordHashHash(
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
			(await this.passwordHashThread()).passwordHashParseMetadata(
				metadata
			),
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
					(await this.secretBoxThread()).secretBoxOpen(
						cyphertext,
						key,
						additionalData
					)
			),
		seal: async (plaintext, key, additionalData) => {
			const cyphertext: Uint8Array = (await this.secretBoxThread()).secretBoxSeal(
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
			(await this.signThread()).signImportSuperSphincsPublicKeys(
				rsa,
				sphincs
			),
		keyPair: async () => (await this.signThread()).signKeyPair(),
		open: async (signed, publicKey, additionalData, decompress) =>
			(await this.signThread()).signOpen(
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
			(await this.signThread()).signSign(
				message,
				privateKey,
				additionalData,
				compress
			),
		signDetached: async (message, privateKey, additionalData) =>
			(await this.signThread()).signSignDetached(
				message,
				privateKey,
				additionalData
			),
		verifyDetached: async (signature, message, publicKey, additionalData) =>
			(await this.signThread()).signVerifyDetached(
				signature,
				message,
				publicKey,
				additionalData
			)
	};

	/** Returns flattened proxy for a Potassium object inside a worker. */
	private async getPotassiumThread () : Promise<any> {
		return this.workerService
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
			.then(async thread => thread.api);
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
