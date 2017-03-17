/* tslint:disable:max-file-line-count max-func-body-length */

import {Injectable} from '@angular/core';
import {IKeyPair} from '../../crypto/ikey-pair';
import {
	IBox,
	IEphemeralKeyExchange,
	IHash,
	IOneTimeAuth,
	IPasswordHash,
	IPotassium,
	ISecretBox,
	ISign,
	PotassiumUtil,
	ThreadEvents
} from '../../crypto/potassium';
import {EventManager, eventManager} from '../../event-manager';
import {Thread} from '../../thread';
import {util} from '../../util';


/**
 * Potassium wrapper that offloads computationally expensive operations to a separate thread.
 */
@Injectable()
export class PotassiumService extends PotassiumUtil implements IPotassium {
	/** @ignore */
	private readonly eventId: string	= util.generateGuid();

	/** @ignore */
	private readonly thread: Thread;

	/** @ignore */
	private readonly threadEvents: ThreadEvents	= new ThreadEvents(this.eventId);

	/** @ignore */
	private readonly threadInit: Promise<void>	= eventManager.one<void>(this.eventId);

	/** @inheritDoc */
	public readonly box: IBox	= {
		keyPair: async () => eventManager.rpcTrigger(
			this.threadEvents.box.keyPair,
			undefined,
			this.threadInit
		),
		open: async (cyphertext: Uint8Array, keyPair: IKeyPair) => eventManager.rpcTrigger(
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
		seal: async (plaintext: Uint8Array, publicKey: Uint8Array) => eventManager.rpcTrigger(
			this.threadEvents.box.seal,
			{plaintext, publicKey}
		)
	};

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: IEphemeralKeyExchange	= {
		aliceKeyPair: async () => eventManager.rpcTrigger(
			this.threadEvents.ephemeralKeyExchange.aliceKeyPair,
			undefined,
			this.threadInit
		),
		aliceSecret: async (
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) => eventManager.rpcTrigger(
			this.threadEvents.ephemeralKeyExchange.aliceSecret,
			{privateKey, publicKey},
			this.threadInit
		),
		bobSecret: async (alicePublicKey: Uint8Array) => eventManager.rpcTrigger(
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
		) => eventManager.rpcTrigger(
			this.threadEvents.hash.deriveKey,
			{clearInput, input, outputBytes},
			this.threadInit
		),
		hash: async (plaintext: Uint8Array|string) => eventManager.rpcTrigger(
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
		sign: async (message: Uint8Array, key: Uint8Array) => eventManager.rpcTrigger(
			this.threadEvents.oneTimeAuth.sign,
			{key, message},
			this.threadInit
		),
		verify: async (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) => eventManager.rpcTrigger(
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
			salt?: Uint8Array,
			outputBytes?: number,
			opsLimit?: number,
			memLimit?: number,
			clearInput?: boolean
		) => eventManager.rpcTrigger(
			this.threadEvents.passwordHash.hash,
			{clearInput, memLimit, opsLimit, outputBytes, plaintext, salt},
			this.threadInit
		),
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
		parseMetadata: async (metadata: Uint8Array) => eventManager.rpcTrigger(
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
		newNonce: async (size: number) => eventManager.rpcTrigger(
			this.threadEvents.secretBox.newNonce,
			{size},
			this.threadInit
		),
		open: async (
			cyphertext: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) => eventManager.rpcTrigger(
			this.threadEvents.secretBox.open,
			{additionalData, cyphertext, key},
			this.threadInit
		),
		seal: async (
			plaintext: Uint8Array,
			key: Uint8Array,
			additionalData?: Uint8Array
		) => eventManager.rpcTrigger(
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
		keyPair: async () => eventManager.rpcTrigger(
			this.threadEvents.sign.keyPair,
			undefined,
			this.threadInit
		),
		open: async (
			signed: Uint8Array|string,
			publicKey: Uint8Array
		) => eventManager.rpcTrigger(
			this.threadEvents.sign.open,
			{publicKey, signed},
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
			privateKey: Uint8Array
		) => eventManager.rpcTrigger(
			this.threadEvents.sign.sign,
			{message, privateKey},
			this.threadInit
		),
		signDetached: async (
			message: Uint8Array|string,
			privateKey: Uint8Array
		) => eventManager.rpcTrigger(
			this.threadEvents.sign.signDetached,
			{message, privateKey},
			this.threadInit
		),
		verifyDetached: async (
			signature: Uint8Array|string,
			message: Uint8Array|string,
			publicKey: Uint8Array
		) => eventManager.rpcTrigger(
			this.threadEvents.sign.verifyDetached,
			{message, publicKey, signature},
			this.threadInit
		)
	};

	/** @inheritDoc */
	public native () : boolean {
		return false;
	}

	constructor () {
		super();

		this.thread	= new Thread(
			/* tslint:disable-next-line:only-arrow-functions */
			async function (
				/* tslint:disable-next-line:variable-name */
				Potassium: any,
				/* tslint:disable-next-line:variable-name */
				ThreadEvents: any,
				eventManager: EventManager,
				importScripts: Function,
				locals: {eventId: string}
			) : Promise<void> {
				importScripts('/js/cyph/crypto/potassium/index.js');

				const potassium: IPotassium			= new Potassium();
				const threadEvents: ThreadEvents	= new ThreadEvents(locals.eventId);

				/* Box */

				eventManager.rpcOn(threadEvents.box.keyPair, async () =>
					potassium.box.keyPair()
				);

				eventManager.rpcOn(threadEvents.box.open, async (o: {
					cyphertext: Uint8Array;
					keyPair: IKeyPair;
				}) =>
					potassium.box.open(o.cyphertext, o.keyPair)
				);

				eventManager.trigger<number>(
					threadEvents.box.privateKeyBytes,
					await potassium.box.privateKeyBytes
				);

				eventManager.trigger<number>(
					threadEvents.box.publicKeyBytes,
					await potassium.box.publicKeyBytes
				);

				eventManager.rpcOn(threadEvents.box.seal, async (o: {
					plaintext: Uint8Array;
					publicKey: Uint8Array;
				}) =>
					potassium.box.seal(o.plaintext, o.publicKey)
				);

				/* EphemeralKeyExchange */

				eventManager.rpcOn(threadEvents.ephemeralKeyExchange.aliceKeyPair, async () =>
					potassium.ephemeralKeyExchange.aliceKeyPair()
				);

				eventManager.rpcOn(threadEvents.ephemeralKeyExchange.aliceSecret, async (o: {
					privateKey: Uint8Array;
					publicKey: Uint8Array;
				}) =>
					potassium.ephemeralKeyExchange.aliceSecret(o.publicKey, o.privateKey)
				);

				eventManager.rpcOn(threadEvents.ephemeralKeyExchange.bobSecret, async (o: {
					alicePublicKey: Uint8Array;
				}) =>
					potassium.ephemeralKeyExchange.bobSecret(o.alicePublicKey)
				);

				eventManager.trigger<number>(
					threadEvents.ephemeralKeyExchange.privateKeyBytes,
					await potassium.ephemeralKeyExchange.privateKeyBytes
				);

				eventManager.trigger<number>(
					threadEvents.ephemeralKeyExchange.publicKeyBytes,
					await potassium.ephemeralKeyExchange.publicKeyBytes
				);

				eventManager.trigger<number>(
					threadEvents.ephemeralKeyExchange.secretBytes,
					await potassium.ephemeralKeyExchange.secretBytes
				);

				/* Hash */

				eventManager.trigger<number>(
					threadEvents.hash.bytes,
					await potassium.hash.bytes
				);

				eventManager.rpcOn(threadEvents.hash.deriveKey, async (o: {
					clearInput?: boolean;
					input: Uint8Array;
					outputBytes?: number;
				}) =>
					potassium.hash.deriveKey(o.input, o.outputBytes, o.clearInput)
				);

				eventManager.rpcOn(threadEvents.hash.hash, async (o: {
					plaintext: Uint8Array;
				}) =>
					potassium.hash.hash(o.plaintext)
				);

				/* OneTimeAuth */

				eventManager.trigger<number>(
					threadEvents.oneTimeAuth.bytes,
					await potassium.oneTimeAuth.bytes
				);

				eventManager.trigger<number>(
					threadEvents.oneTimeAuth.keyBytes,
					await potassium.oneTimeAuth.keyBytes
				);

				eventManager.rpcOn(threadEvents.oneTimeAuth.sign, async (o: {
					key: Uint8Array;
					message: Uint8Array;
				}) =>
					potassium.oneTimeAuth.sign(o.message, o.key)
				);

				eventManager.rpcOn(threadEvents.oneTimeAuth.verify, async (o: {
					key: Uint8Array;
					mac: Uint8Array;
					message: Uint8Array;
				}) =>
					potassium.oneTimeAuth.verify(o.mac, o.message, o.key)
				);

				/* PasswordHash */

				eventManager.trigger<string>(
					threadEvents.passwordHash.algorithm,
					await potassium.passwordHash.algorithm
				);

				eventManager.rpcOn(threadEvents.passwordHash.hash, async (o: {
					clearInput?: boolean;
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
						o.memLimit,
						o.clearInput
					)
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.memLimitInteractive,
					await potassium.passwordHash.memLimitInteractive
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.memLimitSensitive,
					await potassium.passwordHash.memLimitSensitive
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.opsLimitInteractive,
					await potassium.passwordHash.opsLimitInteractive
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.opsLimitSensitive,
					await potassium.passwordHash.opsLimitSensitive
				);

				eventManager.rpcOn(threadEvents.passwordHash.parseMetadata, async (o: {
					metadata: Uint8Array;
				}) =>
					potassium.passwordHash.parseMetadata(o.metadata)
				);

				eventManager.trigger<number>(
					threadEvents.passwordHash.saltBytes,
					await potassium.passwordHash.saltBytes
				);

				/* SecretBox */

				eventManager.trigger<number>(
					threadEvents.secretBox.aeadBytes,
					await potassium.secretBox.aeadBytes
				);

				eventManager.trigger<number>(
					threadEvents.secretBox.keyBytes,
					await potassium.secretBox.keyBytes
				);

				eventManager.rpcOn(threadEvents.secretBox.newNonce, async (o: {
					size: number;
				}) =>
					potassium.secretBox.newNonce(o.size)
				);

				eventManager.rpcOn(threadEvents.secretBox.open, async (o: {
					additionalData?: Uint8Array;
					cyphertext: Uint8Array;
					key: Uint8Array;
				}) =>
					potassium.secretBox.open(o.cyphertext, o.key, o.additionalData)
				);

				eventManager.rpcOn(threadEvents.secretBox.seal, async (o: {
					additionalData?: Uint8Array;
					key: Uint8Array;
					plaintext: Uint8Array;
				}) =>
					potassium.secretBox.seal(o.plaintext, o.key, o.additionalData)
				);

				/* Sign */

				eventManager.trigger<number>(
					threadEvents.sign.bytes,
					await potassium.sign.bytes
				);

				eventManager.rpcOn(threadEvents.sign.keyPair, async () =>
					potassium.sign.keyPair()
				);

				eventManager.rpcOn(threadEvents.sign.open, async (o: {
					publicKey: Uint8Array;
					signed: Uint8Array|string;
				}) =>
					potassium.sign.open(o.signed, o.publicKey)
				);

				eventManager.trigger<number>(
					threadEvents.sign.privateKeyBytes,
					await potassium.sign.privateKeyBytes
				);

				eventManager.trigger<number>(
					threadEvents.sign.publicKeyBytes,
					await potassium.sign.publicKeyBytes
				);

				eventManager.rpcOn(threadEvents.sign.sign, async (o: {
					message: Uint8Array|string;
					privateKey: Uint8Array;
				}) =>
					potassium.sign.sign(o.message, o.privateKey)
				);

				eventManager.rpcOn(threadEvents.sign.signDetached, async (o: {
					message: Uint8Array|string;
					privateKey: Uint8Array;
				}) =>
					potassium.sign.signDetached(o.message, o.privateKey)
				);

				eventManager.rpcOn(threadEvents.sign.verifyDetached, async (o: {
					message: Uint8Array|string;
					publicKey: Uint8Array;
					signature: Uint8Array|string;
				}) =>
					potassium.sign.verifyDetached(o.signature, o.message, o.publicKey)
				);

				eventManager.trigger<void>(locals.eventId);
			},
			{
				eventId: this.eventId
			}
		);
	}
}
