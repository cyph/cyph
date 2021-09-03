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
import {lockFunction} from '../../util/lock';
import {EnvService} from '../env.service';
import {WorkerService} from '../worker.service';

/**
 * Potassium wrapper that offloads computationally expensive operations to a separate thread.
 */
@Injectable()
export class ThreadedPotassiumService
	extends PotassiumUtil
	implements IPotassium
{
	/** Returns flattened proxy for a Potassium object inside a worker. */
	private readonly potassiumInternal = memoize((_I: number) => {
		const potassiumPromise = this.workerService
			.createThread<any>(
				'ThreadedPotassiumService',
				/* eslint-disable-next-line prefer-arrow/prefer-arrow-functions */
				function () : void {
					importScripts(
						'/assets/node_modules/libpotassium/dist/libpotassium.js'
					);

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

		const lock = lockFunction();

		return async (f: (potassium: any) => Promise<any>) =>
			lock(async () => f(await potassiumPromise));
	});

	/** @ignore */
	private roundRobinIndex: number = 0;

	/** @ignore */
	private readonly roundRobinMax: number =
		this.envService.hardwareConcurrency;

	/** Default Potassium thread to use when it doesn't matter which one we pick. */
	private readonly staticValues = new Promise<any>(resolve => {
		this.getPotassium(async potassium => {
			resolve(potassium);
		});
	});

	/** @inheritDoc */
	public readonly box: IBox = {
		keyPair: async () => this.getPotassium(async o => o.boxKeyPair()),
		open: async (cyphertext, keyPair) =>
			this.getPotassium(async o => o.boxOpen(cyphertext, keyPair)),
		privateKeyBytes: this.staticValues.then(async o =>
			o.boxPrivateKeyBytes()
		),
		publicKeyBytes: this.staticValues.then(async o =>
			o.boxPublicKeyBytes()
		),
		seal: async (plaintext, publicKey) =>
			this.getPotassium(async o => o.boxSeal(plaintext, publicKey))
	};

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: IEphemeralKeyExchange = {
		aliceKeyPair: async () =>
			this.getPotassium(async o => o.ephemeralKeyExchangeAliceKeyPair()),
		aliceSecret: async (publicKey, privateKey) =>
			this.getPotassium(async o =>
				o.ephemeralKeyExchangeAliceSecret(publicKey, privateKey)
			),
		bobSecret: async alicePublicKey =>
			this.getPotassium(async o =>
				o.ephemeralKeyExchangeBobSecret(alicePublicKey)
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
			const output = await this.getPotassium(async o =>
				o.hashDeriveKey(input, outputBytes)
			);

			if (clearInput && input instanceof Uint8Array) {
				this.clearMemory(input);
			}

			return output;
		},
		hash: async plaintext =>
			this.getPotassium(async o => o.hashHash(plaintext))
	};

	/** @inheritDoc */
	public readonly oneTimeAuth: IOneTimeAuth = {
		bytes: this.staticValues.then(async o => o.oneTimeAuthBytes()),
		keyBytes: this.staticValues.then(async o => o.oneTimeAuthKeyBytes()),
		sign: async (message, key) =>
			this.getPotassium(async o => o.oneTimeAuthSign(message, key)),
		verify: async (mac, message, key) =>
			this.getPotassium(async o => o.oneTimeAuthVerify(mac, message, key))
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
			const output = await this.getPotassium(async o =>
				o.passwordHashHash(
					plaintext,
					salt,
					outputBytes,
					opsLimit,
					memLimit
				)
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
			this.getPotassium(async o => o.passwordHashParseMetadata(metadata)),
		saltBytes: this.staticValues.then(async o => o.passwordHashSaltBytes())
	};

	/** @inheritDoc */
	public readonly secretBox: ISecretBox = {
		aeadBytes: this.staticValues.then(async o => o.secretBoxAeadBytes()),
		keyBytes: this.staticValues.then(async o => o.secretBoxKeyBytes()),
		open: async (cyphertext, key, additionalData) =>
			this.getPotassium(async o =>
				o.secretBoxOpen(cyphertext, key, additionalData)
			),
		seal: async (plaintext, key, additionalData) =>
			this.getPotassium(async o =>
				o.secretBoxSeal(plaintext, key, additionalData)
			)
	};

	/** @inheritDoc */
	public readonly sign: ISign = {
		bytes: this.staticValues.then(async o => o.signBytes()),
		importSuperSphincsPublicKeys: async (rsa, sphincs) =>
			this.getPotassium(async o =>
				o.signImportSuperSphincsPublicKeys(rsa, sphincs)
			),
		keyPair: async () => this.getPotassium(async o => o.signKeyPair()),
		open: async (signed, publicKey, additionalData, decompress) =>
			this.getPotassium(async o =>
				o.signOpen(signed, publicKey, additionalData, decompress)
			),
		privateKeyBytes: this.staticValues.then(async o =>
			o.signPrivateKeyBytes()
		),
		publicKeyBytes: this.staticValues.then(async o =>
			o.signPublicKeyBytes()
		),
		sign: async (message, privateKey, additionalData, compress) =>
			this.getPotassium(async o =>
				o.signSign(message, privateKey, additionalData, compress)
			),
		signDetached: async (message, privateKey, additionalData) =>
			this.getPotassium(async o =>
				o.signSignDetached(message, privateKey, additionalData)
			),
		verifyDetached: async (signature, message, publicKey, additionalData) =>
			this.getPotassium(async o =>
				o.signVerifyDetached(
					signature,
					message,
					publicKey,
					additionalData
				)
			)
	};

	/** Potassium thread pool (round robin load balanced for now). */
	private async getPotassium (
		f: (potassium: any) => Promise<any>
	) : Promise<any> {
		this.roundRobinIndex =
			this.roundRobinIndex >= this.roundRobinMax ?
				0 :
				this.roundRobinIndex + 1;

		return this.potassiumInternal(this.roundRobinIndex)(f);
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
		private readonly workerService: WorkerService
	) {
		super();
	}
}
