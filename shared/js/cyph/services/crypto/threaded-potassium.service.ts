/* tslint:disable:max-file-line-count max-func-body-length */

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
import {ThreadEvents} from '../../crypto/potassium/thread-events';
import {EventManager, eventManager} from '../../event-manager';
import {IKeyPair} from '../../proto';
import {uuid} from '../../util/uuid';
import {EnvService} from '../env.service';
import {WorkerService} from '../worker.service';


/**
 * Potassium wrapper that offloads computationally expensive operations to a separate thread.
 */
@Injectable()
export class ThreadedPotassiumService extends PotassiumUtil implements IPotassium {
	/** @ignore */
	private readonly eventID: string	= uuid();

	/** @ignore */
	private readonly threadEvents: ThreadEvents	= new ThreadEvents(this.eventID);

	/** @ignore */
	private readonly threadInit: Promise<void>	= eventManager.one<void>(this.eventID);

	/** @inheritDoc */
	public readonly box: IBox	= {
		keyPair: async () => eventManager.rpcTrigger<IKeyPair>(
			this.threadEvents.box.keyPair,
			undefined,
			this.threadInit
		),
		open: async (
			cyphertext: Uint8Array,
			keyPair: IKeyPair
		) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.box.open,
			{cyphertext, keyPair},
			this.threadInit
		),
		privateKeyBytes: eventManager.one<number>(
			this.threadEvents.box.privateKeyBytes
		),
		publicKeyBytes: eventManager.one<number>(
			this.threadEvents.box.publicKeyBytes
		),
		seal: async (
			plaintext: Uint8Array,
			publicKey: Uint8Array
		) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.box.seal,
			{plaintext, publicKey},
			this.threadInit
		)
	};

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: IEphemeralKeyExchange	= {
		aliceKeyPair: async () => eventManager.rpcTrigger<IKeyPair>(
			this.threadEvents.ephemeralKeyExchange.aliceKeyPair,
			undefined,
			this.threadInit
		),
		aliceSecret: async (
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.ephemeralKeyExchange.aliceSecret,
			{privateKey, publicKey},
			this.threadInit
		),
		bobSecret: async (alicePublicKey: Uint8Array) => eventManager.rpcTrigger<{
			publicKey: Uint8Array;
			secret: Uint8Array;
		}>(
			this.threadEvents.ephemeralKeyExchange.bobSecret,
			{alicePublicKey},
			this.threadInit
		),
		privateKeyBytes: eventManager.one<number>(
			this.threadEvents.ephemeralKeyExchange.privateKeyBytes
		),
		publicKeyBytes: eventManager.one<number>(
			this.threadEvents.ephemeralKeyExchange.publicKeyBytes
		),
		secretBytes: eventManager.one<number>(
			this.threadEvents.ephemeralKeyExchange.secretBytes
		)
	};

	/** @inheritDoc */
	public readonly hash: IHash	= {
		bytes: eventManager.one<number>(
			this.threadEvents.hash.bytes
		),
		deriveKey: async (
			input: Uint8Array,
			outputBytes?: number,
			clearInput?: boolean
		) => {
			const output	= await eventManager.rpcTrigger<Uint8Array>(
				this.threadEvents.hash.deriveKey,
				{input, outputBytes},
				this.threadInit
			);

			if (clearInput) {
				this.clearMemory(input);
			}

			return output;
		},
		hash: async (plaintext: Uint8Array|string) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.hash.hash,
			{plaintext},
			this.threadInit
		)
	};

	/** @inheritDoc */
	public readonly oneTimeAuth: IOneTimeAuth	= {
		bytes: eventManager.one<number>(
			this.threadEvents.oneTimeAuth.bytes
		),
		keyBytes: eventManager.one<number>(
			this.threadEvents.oneTimeAuth.keyBytes
		),
		sign: async (message: Uint8Array, key: Uint8Array) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.oneTimeAuth.sign,
			{key, message},
			this.threadInit
		),
		verify: async (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) => eventManager.rpcTrigger<boolean>(
			this.threadEvents.oneTimeAuth.verify,
			{key, mac, message},
			this.threadInit
		)
	};

	/** @inheritDoc */
	public readonly passwordHash: IPasswordHash	= {
		algorithm: eventManager.one<string>(
			this.threadEvents.passwordHash.algorithm
		),
		hash: async (
			plaintext: Uint8Array|string,
			salt?: Uint8Array|string,
			outputBytes?: number,
			opsLimit?: number,
			memLimit?: number,
			clearInput?: boolean
		) => {
			const output	= await eventManager.rpcTrigger<{
				hash: Uint8Array;
				metadata: Uint8Array;
				metadataObject: {
					algorithm: string;
					memLimit: number;
					opsLimit: number;
					salt: Uint8Array;
				};
			}>(
				this.threadEvents.passwordHash.hash,
				{memLimit, opsLimit, outputBytes, plaintext, salt},
				this.threadInit
			);

			if (clearInput && plaintext instanceof Uint8Array) {
				this.clearMemory(plaintext);
			}
			if (clearInput && salt instanceof Uint8Array) {
				this.clearMemory(salt);
			}

			return output;
		},
		memLimitInteractive: eventManager.one<number>(
			this.threadEvents.passwordHash.memLimitInteractive
		),
		memLimitSensitive: eventManager.one<number>(
			this.threadEvents.passwordHash.memLimitSensitive
		),
		opsLimitInteractive: eventManager.one<number>(
			this.threadEvents.passwordHash.opsLimitInteractive
		),
		opsLimitSensitive: eventManager.one<number>(
			this.threadEvents.passwordHash.opsLimitSensitive
		),
		parseMetadata: async (metadata: Uint8Array) => eventManager.rpcTrigger<{
			algorithm: string;
			memLimit: number;
			opsLimit: number;
			salt: Uint8Array;
		}>(
			this.threadEvents.passwordHash.parseMetadata,
			{metadata},
			this.threadInit
		),
		saltBytes: eventManager.one<number>(
			this.threadEvents.passwordHash.saltBytes
		)
	};

	/** @inheritDoc */
	public readonly secretBox: ISecretBox	= {
		aeadBytes: eventManager.one<number>(
			this.threadEvents.secretBox.aeadBytes
		),
		keyBytes: eventManager.one<number>(
			this.threadEvents.secretBox.keyBytes
		),
		open: async (
			cyphertext: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array|string
		) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.secretBox.open,
			{additionalData, cyphertext, key},
			this.threadInit
		),
		seal: async (
			plaintext: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array|string
		) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.secretBox.seal,
			{additionalData, key, plaintext},
			this.threadInit
		)
	};

	/** @inheritDoc */
	public readonly sign: ISign	= {
		bytes: eventManager.one<number>(
			this.threadEvents.sign.bytes
		),
		importSuperSphincsPublicKeys: async (
			rsa: string,
			sphincs: string
		) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.sign.importSuperSphincsPublicKeys,
			{rsa, sphincs},
			this.threadInit
		),
		keyPair: async () => eventManager.rpcTrigger<IKeyPair>(
			this.threadEvents.sign.keyPair,
			undefined,
			this.threadInit
		),
		open: async (
			signed: Uint8Array|string,
			publicKey: Uint8Array,
			additionalData?: Uint8Array|string,
			decompress?: boolean
		) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.sign.open,
			{additionalData, decompress, publicKey, signed},
			this.threadInit
		),
		privateKeyBytes: eventManager.one<number>(
			this.threadEvents.sign.privateKeyBytes
		),
		publicKeyBytes: eventManager.one<number>(
			this.threadEvents.sign.publicKeyBytes
		),
		sign: async (
			message: Uint8Array|string,
			privateKey: Uint8Array,
			additionalData?: Uint8Array|string,
			compress?: boolean
		) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.sign.sign,
			{additionalData, compress, message, privateKey},
			this.threadInit
		),
		signDetached: async (
			message: Uint8Array|string,
			privateKey: Uint8Array,
			additionalData?: Uint8Array|string
		) => eventManager.rpcTrigger<Uint8Array>(
			this.threadEvents.sign.signDetached,
			{additionalData, message, privateKey},
			this.threadInit
		),
		verifyDetached: async (
			signature: Uint8Array|string,
			message: Uint8Array|string,
			publicKey: Uint8Array,
			additionalData?: Uint8Array|string
		) => eventManager.rpcTrigger<boolean>(
			this.threadEvents.sign.verifyDetached,
			{additionalData, message, publicKey, signature},
			this.threadInit
		)
	};

	/** @inheritDoc */
	public async isNativeCryptoSupported () : Promise<boolean> {
		return isNativeCryptoSupported();
	}

	/** @inheritDoc */
	public async native () : Promise<boolean> {
		return !!(
			this.envService.environment.customBuild &&
			this.envService.environment.customBuild.config.nativeCrypto
		);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super();

		this.workerService.createThread(
			/* tslint:disable-next-line:only-arrow-functions */
			async function () : Promise<void> {
				importScripts('/assets/js/cyph/crypto/potassium/index.js');

				/* tslint:disable-next-line:no-shadowed-variable */
				const eventManager: EventManager					= (<any> self).eventManager;
				const locals: {eventID: string; isNative: boolean}	= (<any> self).locals;
				/* tslint:disable-next-line:variable-name */
				const Potassium: any								= (<any> self).Potassium;
				/* tslint:disable-next-line:no-shadowed-variable variable-name */
				const ThreadEvents: any								= (<any> self).ThreadEvents;

				const potassium: IPotassium			= new Potassium(locals.isNative);
				const threadEvents: ThreadEvents	= new ThreadEvents(locals.eventID);

				const clearData	= (
					input: Uint8Array|undefined|{
						[s: string]: boolean|number|string|Uint8Array|undefined|{
							[s: string]: Uint8Array;
						};
					},
					output: boolean|string|Uint8Array|undefined|{
						[s: string]: number|string|Uint8Array|{
							[s: string]: number|string|Uint8Array;
						};
					}
				) => {
					for (const o of [input, output]) {
						if (
							o === undefined ||
							typeof o === 'boolean' ||
							typeof o === 'string'
						) {
							continue;
						}
						else if (o instanceof Uint8Array) {
							potassium.clearMemory(o);
							continue;
						}

						for (const k of Object.keys(o)) {
							const v	= o[k];

							if (
								v === undefined ||
								typeof v === 'boolean' ||
								typeof v === 'number' ||
								typeof v === 'string'
							) {
								continue;
							}
							else if (v instanceof Uint8Array) {
								potassium.clearMemory(v);
								continue;
							}

							for (const k2 of Object.keys(v)) {
								const v2	= v[k2];

								if (v2 instanceof Uint8Array) {
									potassium.clearMemory(v2);
								}
							}
						}
					}
				};

				/* Box */

				eventManager.rpcOn(
					threadEvents.box.keyPair,
					async () =>
						<Promise<{privateKey: Uint8Array; publicKey: Uint8Array}>>
						potassium.box.keyPair()
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.box.open,
					async (o: {
						cyphertext: Uint8Array;
						keyPair: {privateKey: Uint8Array; publicKey: Uint8Array};
					}) =>
						potassium.box.open(o.cyphertext, o.keyPair)
					,
					clearData
				);

				eventManager.trigger<number>(
					threadEvents.box.privateKeyBytes,
					await potassium.box.privateKeyBytes,
					true
				);

				eventManager.trigger<number>(
					threadEvents.box.publicKeyBytes,
					await potassium.box.publicKeyBytes,
					true
				);

				eventManager.rpcOn(
					threadEvents.box.seal,
					async (o: {
						plaintext: Uint8Array;
						publicKey: Uint8Array;
					}) =>
						potassium.box.seal(o.plaintext, o.publicKey)
					,
					clearData
				);

				/* EphemeralKeyExchange */

				eventManager.rpcOn(
					threadEvents.ephemeralKeyExchange.aliceKeyPair,
					async () =>
						<Promise<{privateKey: Uint8Array; publicKey: Uint8Array}>>
						potassium.ephemeralKeyExchange.aliceKeyPair()
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.ephemeralKeyExchange.aliceSecret,
					async (o: {
						privateKey: Uint8Array;
						publicKey: Uint8Array;
					}) =>
						potassium.ephemeralKeyExchange.aliceSecret(o.publicKey, o.privateKey)
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.ephemeralKeyExchange.bobSecret,
					async (o: {
						alicePublicKey: Uint8Array;
					}) =>
						potassium.ephemeralKeyExchange.bobSecret(o.alicePublicKey)
					,
					clearData
				);

				eventManager.trigger<number>(
					threadEvents.ephemeralKeyExchange.privateKeyBytes,
					await potassium.ephemeralKeyExchange.privateKeyBytes,
					true
				);

				eventManager.trigger<number>(
					threadEvents.ephemeralKeyExchange.publicKeyBytes,
					await potassium.ephemeralKeyExchange.publicKeyBytes,
					true
				);

				eventManager.trigger<number>(
					threadEvents.ephemeralKeyExchange.secretBytes,
					await potassium.ephemeralKeyExchange.secretBytes,
					true
				);

				/* Hash */

				eventManager.trigger<number>(
					threadEvents.hash.bytes,
					await potassium.hash.bytes,
					true
				);

				eventManager.rpcOn(
					threadEvents.hash.deriveKey,
					async (o: {
						input: Uint8Array;
						outputBytes?: number;
					}) =>
						potassium.hash.deriveKey(o.input, o.outputBytes)
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.hash.hash,
					async (o: {
						plaintext: Uint8Array;
					}) =>
						potassium.hash.hash(o.plaintext)
					,
					clearData
				);

				/* OneTimeAuth */

				eventManager.trigger<number>(
					threadEvents.oneTimeAuth.bytes,
					await potassium.oneTimeAuth.bytes,
					true
				);

				eventManager.trigger<number>(
					threadEvents.oneTimeAuth.keyBytes,
					await potassium.oneTimeAuth.keyBytes,
					true
				);

				eventManager.rpcOn(
					threadEvents.oneTimeAuth.sign,
					async (o: {
						key: Uint8Array;
						message: Uint8Array;
					}) =>
						potassium.oneTimeAuth.sign(o.message, o.key)
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.oneTimeAuth.verify,
					async (o: {
						key: Uint8Array;
						mac: Uint8Array;
						message: Uint8Array;
					}) =>
						potassium.oneTimeAuth.verify(o.mac, o.message, o.key)
					,
					clearData
				);

				/* PasswordHash */

				eventManager.trigger<string>(
					threadEvents.passwordHash.algorithm,
					await potassium.passwordHash.algorithm,
					true
				);

				eventManager.rpcOn(
					threadEvents.passwordHash.hash,
					async (o: {
						memLimit?: number;
						opsLimit?: number;
						outputBytes?: number;
						plaintext: Uint8Array|string;
						salt?: Uint8Array;
					}) =>
						potassium.passwordHash.hash(
							o.plaintext,
							o.salt,
							o.outputBytes,
							o.opsLimit,
							o.memLimit
						)
					,
					clearData
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.memLimitInteractive,
					await potassium.passwordHash.memLimitInteractive,
					true
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.memLimitSensitive,
					await potassium.passwordHash.memLimitSensitive,
					true
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.opsLimitInteractive,
					await potassium.passwordHash.opsLimitInteractive,
					true
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.opsLimitSensitive,
					await potassium.passwordHash.opsLimitSensitive,
					true
				);

				eventManager.rpcOn(
					threadEvents.passwordHash.parseMetadata,
					async (o: {
						metadata: Uint8Array;
					}) =>
						potassium.passwordHash.parseMetadata(o.metadata)
					,
					clearData
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.saltBytes,
					await potassium.passwordHash.saltBytes,
					true
				);

				/* SecretBox */

				eventManager.trigger<number>(
					threadEvents.secretBox.aeadBytes,
					await potassium.secretBox.aeadBytes,
					true
				);

				eventManager.trigger<number>(
					threadEvents.secretBox.keyBytes,
					await potassium.secretBox.keyBytes,
					true
				);

				eventManager.rpcOn(
					threadEvents.secretBox.open,
					async (o: {
						additionalData?: Uint8Array|string;
						cyphertext: Uint8Array;
						key: Uint8Array;
					}) =>
						potassium.secretBox.open(o.cyphertext, o.key, o.additionalData)
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.secretBox.seal,
					async (o: {
						additionalData?: Uint8Array|string;
						key: Uint8Array;
						plaintext: Uint8Array;
					}) =>
						potassium.secretBox.seal(o.plaintext, o.key, o.additionalData)
					,
					clearData
				);

				/* Sign */

				eventManager.trigger<number>(
					threadEvents.sign.bytes,
					await potassium.sign.bytes,
					true
				);

				eventManager.rpcOn(
					threadEvents.sign.importSuperSphincsPublicKeys,
					async (o: {rsa: string; sphincs: string}) =>
						potassium.sign.importSuperSphincsPublicKeys(o.rsa, o.sphincs)
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.sign.keyPair,
					async () =>
						<Promise<{privateKey: Uint8Array; publicKey: Uint8Array}>>
						potassium.sign.keyPair()
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.sign.open,
					async (o: {
						additionalData?: Uint8Array|string;
						decompress?: boolean;
						publicKey: Uint8Array;
						signed: Uint8Array|string;
					}) =>
						potassium.sign.open(o.signed, o.publicKey, o.additionalData, o.decompress)
					,
					clearData
				);

				eventManager.trigger<number>(
					threadEvents.sign.privateKeyBytes,
					await potassium.sign.privateKeyBytes,
					true
				);

				eventManager.trigger<number>(
					threadEvents.sign.publicKeyBytes,
					await potassium.sign.publicKeyBytes,
					true
				);

				eventManager.rpcOn(
					threadEvents.sign.sign,
					async (o: {
						additionalData?: Uint8Array|string;
						compress?: boolean;
						message: Uint8Array|string;
						privateKey: Uint8Array;
					}) =>
						potassium.sign.sign(o.message, o.privateKey, o.additionalData, o.compress)
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.sign.signDetached,
					async (o: {
						additionalData?: Uint8Array|string;
						message: Uint8Array|string;
						privateKey: Uint8Array;
					}) =>
						potassium.sign.signDetached(o.message, o.privateKey, o.additionalData)
					,
					clearData
				);

				eventManager.rpcOn(
					threadEvents.sign.verifyDetached,
					async (o: {
						additionalData?: Uint8Array|string;
						message: Uint8Array|string;
						publicKey: Uint8Array;
						signature: Uint8Array|string;
					}) =>
						potassium.sign.verifyDetached(
							o.signature,
							o.message,
							o.publicKey,
							o.additionalData
						)
					,
					clearData
				);

				eventManager.trigger<void>(locals.eventID, undefined, true);
			},
			(async () => ({
				eventID: this.eventID,
				isNative: await this.native()
			}))()
		);
	}
}
