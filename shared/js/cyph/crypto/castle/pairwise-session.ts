/* eslint-disable max-lines */

import {IAsyncList} from '../../iasync-list';
import {IAsyncValue} from '../../iasync-value';
import {IResolvable} from '../../iresolvable';
import {LocalAsyncList} from '../../local-async-list';
import {LocalAsyncValue} from '../../local-async-value';
import {LockFunction} from '../../lock-function-type';
import {
	CastleRatchetState,
	ICastleRatchetState,
	ICastleRatchetUpdate
} from '../../proto';
import {lockFunction} from '../../util/lock';
import {debugLog, debugLogError} from '../../util/log';
import {deserialize, serialize} from '../../util/serialization';
import {resolvable, retryUntilSuccessful, sleep} from '../../util/wait';
import {IPotassium} from '../potassium/ipotassium';
import {Core} from './core';
import {HandshakeSteps} from './enums';
import {ICastleIncomingMessages} from './icastle-incoming-messages';
import {IHandshakeState} from './ihandshake-state';
import {ILocalUser} from './ilocal-user';
import {IPairwiseSession} from './ipairwise-session';
import {IRemoteUser} from './iremote-user';
import {Transport} from './transport';

/** @inheritDoc */
export class PairwiseSession implements IPairwiseSession {
	/** @ignore */
	private readonly incomingMessageQueue = new LocalAsyncList<{
		cyphertext: Uint8Array;
		newMessageID: number;
		resolve: () => void;
	}>([]);

	/** @ignore */
	private readonly instanceID: Uint8Array = this.potassium.randomBytes(16);

	/** @ignore */
	private pendingMessageResolvers?: {
		resolvers: Map<number, IResolvable<void>>;
		timestamps: Map<number, number>;
	};

	/** @inheritDoc */
	public readonly initialMessagesProcessed = resolvable();

	/** @ignore */
	private async abort () : Promise<void> {
		debugLog(() => ({castleHandshake: 'abort'}));
		await this.handshakeState.currentStep.setValue(HandshakeSteps.Aborted);
		await this.transport.abort();
	}

	/** @ignore */
	private async connect () : Promise<void> {
		debugLog(() => ({castleHandshake: 'connect'}));

		if (
			(await this.handshakeState.currentStep.getValue()) ===
			HandshakeSteps.Complete
		) {
			return;
		}

		await this.handshakeState.currentStep.setValue(HandshakeSteps.Complete);
		await this.transport.connect();
	}

	/** @ignore */
	private async processIncomingMessages (
		core: Core,
		newMessageID: number,
		cyphertext: Uint8Array
	) : Promise<void> {
		const incomingMessages = await this.incomingMessages.getValue();
		const nextIncomingMessageID = core.ratchetState.incomingMessageID + 1;

		debugLog(() => ({
			pairwiseSessionIncomingMessage: {
				cyphertext,
				incomingMessages,
				newMessageID,
				nextIncomingMessageID
			}
		}));

		incomingMessages.max = Math.max(
			incomingMessages.max,
			newMessageID,
			nextIncomingMessageID
		);

		if (newMessageID >= nextIncomingMessageID) {
			incomingMessages.queue[newMessageID] = [
				...(incomingMessages.queue[newMessageID] || []),
				cyphertext
			];
		}

		for (let id = nextIncomingMessageID; id <= incomingMessages.max; ++id) {
			const message = incomingMessages.queue[id];

			if (message === undefined) {
				continue;
			}

			for (const cyphertextBytes of message) {
				try {
					debugLog(() => ({
						castleDecryptAttempt: {cyphertextBytes, message, id}
					}));
					await core.decrypt(cyphertextBytes);
					debugLog(() => ({castleDecryptSuccess: {id}}));
					delete incomingMessages.queue[id];
					break;
				}
				catch (err) {
					debugLog(() => ({castleDecryptError: {err, id}}));
				}
			}
		}

		await this.incomingMessages.setValue(incomingMessages);
	}

	/** @ignore */
	private async ratchetBootstrapIncoming () : Promise<void> {
		const [
			encryptionKeyPair,
			publicSigningKey,
			cyphertext
		] = await Promise.all([
			this.localUser.getEncryptionKeyPair(),
			this.remoteUser.getPublicSigningKey(),
			this.handshakeState.initialSecretCyphertext.getValue()
		]);

		let maybeSignedSecret: Uint8Array;

		try {
			maybeSignedSecret = await this.potassium.box.open(
				cyphertext,
				encryptionKeyPair
			);
		}
		catch (err) {
			debugLogError(() => ({
				ratchetBootstrapIncomingFailure: {
					cyphertext,
					encryptionKeyPair: () => encryptionKeyPair,
					err,
					publicSigningKey
				}
			}));

			throw err;
		}

		await this.handshakeState.initialSecret.setValue(
			publicSigningKey ?
				await this.potassium.sign.open(
					maybeSignedSecret,
					publicSigningKey
				) :
				maybeSignedSecret
		);

		await this.handshakeState.currentStep.setValue(
			HandshakeSteps.PostBootstrap
		);
	}

	/** @ignore */
	private async ratchetBootstrapOutgoing () : Promise<void> {
		const [
			signingKeyPair,
			publicEncryptionKey,
			initialSecret
		] = await Promise.all([
			this.localUser.getSigningKeyPair(),
			this.remoteUser.getPublicEncryptionKey(),
			(async () => {
				let secret = await this.handshakeState.initialSecret.getValue();

				if (!secret) {
					secret = this.potassium.randomBytes(
						await this.potassium.ephemeralKeyExchange.secretBytes
					);

					await this.handshakeState.initialSecret.setValue(secret);
				}

				return secret;
			})()
		]);

		await this.handshakeState.initialSecretCyphertext.setValue(
			await this.potassium.box.seal(
				signingKeyPair ?
					await this.potassium.sign.sign(
						initialSecret,
						signingKeyPair.privateKey
					) :
					initialSecret,
				publicEncryptionKey
			)
		);

		await this.handshakeState.currentStep.setValue(
			HandshakeSteps.PostBootstrap
		);
	}

	/** @inheritDoc */
	public async receive (
		cyphertext: Uint8Array,
		_INITIAL: boolean
	) : Promise<void> {
		if (
			(await this.handshakeState.currentStep.getValue()) ===
			HandshakeSteps.Aborted
		) {
			return this.abort();
		}

		const {promise, resolve} = resolvable();

		await this.incomingMessageQueue.pushItem({
			cyphertext,
			newMessageID: this.potassium
				.toDataView(cyphertext)
				.getUint32(0, true),
			resolve
		});

		return promise;
	}

	/** @inheritDoc */
	public async send (
		plaintext: string | ArrayBufferView,
		timestamp: number
	) : Promise<void> {
		if (
			(await this.handshakeState.currentStep.getValue()) ===
			HandshakeSteps.Aborted
		) {
			return this.abort();
		}

		const plaintextBytes = this.potassium.fromString(plaintext);
		const timestampBytes = new Float64Array([timestamp]);

		const outgoingMessage = this.potassium.concatMemory(
			false,
			timestampBytes,
			this.instanceID,
			plaintextBytes
		);

		this.potassium.clearMemory(plaintextBytes);
		this.potassium.clearMemory(timestampBytes);

		let resolver: IResolvable<void> | undefined;

		if (this.pendingMessageResolvers) {
			resolver = resolvable();
			this.pendingMessageResolvers.resolvers.set(timestamp, resolver);
		}

		await this.outgoingMessageQueue.pushItem(outgoingMessage);

		if (resolver) {
			await resolver.promise;
		}
	}

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly transport: Transport,

		/** @ignore */
		private readonly localUser: ILocalUser,

		/** @ignore */
		private readonly remoteUser: IRemoteUser,

		/** @ignore */
		private readonly handshakeState: IHandshakeState,

		/** @ignore */
		private readonly incomingMessages: IAsyncValue<
			ICastleIncomingMessages
		> = new LocalAsyncValue<ICastleIncomingMessages>({max: 0, queue: {}}),
		/** @ignore */
		private readonly outgoingMessageQueue: IAsyncList<
			Uint8Array
		> = new LocalAsyncList([]),

		/** @ignore */
		private readonly lock: LockFunction = lockFunction(),

		/** @ignore */
		private readonly ratchetState: IAsyncValue<
			ICastleRatchetState
		> = new LocalAsyncValue<ICastleRatchetState>({
			asymmetric: {
				privateKey: new Uint8Array(0),
				publicKey: new Uint8Array(0)
			},
			incomingMessageID: 0,
			outgoingMessageID: 1,
			symmetric: {
				current: {
					incoming: new Uint8Array(0),
					outgoing: new Uint8Array(0)
				},
				next: {
					incoming: new Uint8Array(0),
					outgoing: new Uint8Array(0)
				}
			}
		}),
		/** @ignore */
		private readonly ratchetUpdateQueue: IAsyncList<
			ICastleRatchetUpdate
		> = new LocalAsyncList([])
	) {
		debugLog(() => ({pairwiseSessionStart: true}));

		retryUntilSuccessful(async () => {
			while (this.transport.isAlive) {
				const currentStep = await this.handshakeState.currentStep.getValue();

				if (currentStep === HandshakeSteps.Aborted) {
					this.abort();
					return;
				}

				/* Bootstrap asymmetric ratchet */
				if (currentStep === HandshakeSteps.Start) {
					debugLog(() => ({
						castleHandshake: 'start',
						castleHandshakeState: this.handshakeState
					}));

					if (this.handshakeState.isAlice) {
						await this.ratchetBootstrapOutgoing();
					}
					else {
						await this.ratchetBootstrapIncoming();
					}
				}

				/* Initialize symmetric ratchet */
				else if (
					currentStep === HandshakeSteps.PostBootstrap &&
					this.potassium.isEmpty(
						await this.ratchetState
							.getValue()
							.then(o => o.symmetric.current.incoming)
					)
				) {
					debugLog(() => ({castleHandshake: 'post-bootstrap'}));

					const initialSecret = await this.handshakeState.initialSecret.getValue();

					if (!initialSecret) {
						throw new Error(
							'Invalid HandshakeSteps.PostBootstrap state.'
						);
					}

					const symmetricKeys = await Core.newSymmetricKeys(
						this.potassium,
						this.handshakeState.isAlice,
						initialSecret
					);

					await this.ratchetState.setValue({
						asymmetric: {
							privateKey: new Uint8Array(0),
							publicKey: new Uint8Array(0)
						},
						incomingMessageID: 0,
						outgoingMessageID: 1,
						symmetric: {
							current: symmetricKeys,
							next: {
								incoming: new Uint8Array(
									symmetricKeys.incoming
								),
								outgoing: new Uint8Array(symmetricKeys.outgoing)
							}
						}
					});
				}

				/* Ready to activate Core */
				else {
					debugLog(() => ({castleHandshake: 'final step'}));

					await this.connect();

					const pendingMessageResolvers = {
						resolvers: new Map<number, IResolvable<void>>(),
						timestamps: new Map<number, number>()
					};

					/*
						Honeybadger workaround: if lock isn't claimed for a while,
						resolve this prematurely to dismiss unneeded loading banner.

						Longer-term, perhaps have a signal sent from the client with
						the lock to this one that initialMessagesProcessed is done.
					*/
					let lockClaimed = false;
					sleep(2500).then(() => {
						if (!lockClaimed) {
							this.initialMessagesProcessed.resolve();
						}
					});

					return this.lock(async o => {
						lockClaimed = true;

						debugLog(() => ({castleLockClaimed: o}));

						this.pendingMessageResolvers = pendingMessageResolvers;

						this.handshakeState.initialSecret
							.getValue()
							.then(symmetricKey => {
								if (symmetricKey === undefined) {
									throw new Error(
										'Castle session symmetric key not found.'
									);
								}

								this.transport.setSymmetricKey(symmetricKey);
							});

						const initialRatchetUpdates = await this.ratchetUpdateQueue.getValue();

						if (!o.stillOwner.value) {
							return;
						}

						await this.transport
							.process(
								this.remoteUser.username,
								false,
								...initialRatchetUpdates
							)
							.catch(err => {
								debugLogError(() => ({
									castleProcessInitialRatchetUpdates: err
								}));
							});

						this.initialMessagesProcessed.resolve();

						if (!o.stillOwner.value) {
							return;
						}

						const lastRatchetUpdate = (<
							(ICastleRatchetUpdate | undefined)[]
						> initialRatchetUpdates).slice(-1)[0];

						debugLog(() => ({
							castleProcessedInitialRatchetUpdates: {
								initialRatchetUpdates,
								lastRatchetUpdate
							}
						}));

						if (lastRatchetUpdate) {
							await this.ratchetState.setValue(
								lastRatchetUpdate.ratchetState
							);
						}

						if (!o.stillOwner.value) {
							return;
						}

						const core = new Core(
							this.potassium,
							this.handshakeState.isAlice,
							this.ratchetUpdateQueue,
							lastRatchetUpdate ?
								await deserialize(
									CastleRatchetState,
									await serialize(
										CastleRatchetState,
										lastRatchetUpdate.ratchetState
									)
								) :
								await this.ratchetState.getValue()
						);

						if (!o.stillOwner.value) {
							return;
						}

						debugLog(() => ({castleCoreStarted: true}));

						const receiveLock = lockFunction();

						const decryptSub = this.incomingMessageQueue.subscribeAndPop(
							async ({cyphertext, newMessageID, resolve}) => {
								debugLog(() => ({
									castleIncomingCyphertext: {
										author: this.remoteUser.username,
										cyphertext,
										newMessageID
									}
								}));

								this.transport.logCyphertext(
									this.remoteUser.username,
									cyphertext
								);

								const decryptSetup = core.decryptSetup(
									cyphertext
								);

								debugLog(() => ({
									castleIncomingCyphertextDecryptSetup: {
										decryptSetup,
										newMessageID
									}
								}));

								await receiveLock(async () => {
									await this.processIncomingMessages(
										core,
										newMessageID,
										cyphertext
									);
									resolve();
								});
							}
						);

						const encryptSub = this.outgoingMessageQueue.subscribeAndPop(
							async message =>
								core.encrypt(message, messageID => {
									pendingMessageResolvers.timestamps.set(
										messageID,
										this.potassium
											.toDataView(message)
											.getFloat64(0, true)
									);
								})
						);

						const ratchetUpdateSub = this.ratchetUpdateQueue.subscribeAndPop(
							async update => {
								if (
									lastRatchetUpdate &&
									lastRatchetUpdate.ratchetState
										.incomingMessageID >=
										update.ratchetState.incomingMessageID &&
									lastRatchetUpdate.ratchetState
										.outgoingMessageID >=
										update.ratchetState.outgoingMessageID
								) {
									debugLog(() => ({
										ratchetUpdate: {update, dropped: true}
									}));
									return;
								}

								debugLog(() => ({
									ratchetUpdate: {update, dropped: false}
								}));

								await this.transport.process(
									this.remoteUser.username,
									false,
									update
								);
								await this.ratchetState.setValue(
									update.ratchetState
								);

								if (
									!update.cyphertext ||
									this.potassium.isEmpty(update.cyphertext)
								) {
									return;
								}

								const messageID = this.potassium
									.toDataView(update.cyphertext)
									.getUint32(0, true);

								const timestamp = pendingMessageResolvers.timestamps.get(
									messageID
								);

								const resolver =
									timestamp !== undefined ?
										pendingMessageResolvers.resolvers.get(
											timestamp
										) :
										undefined;

								debugLog(() => ({
									ratchetUpdateSend: {
										messageID,
										resolver: resolver !== undefined,
										timestamp,
										update
									}
								}));

								if (resolver) {
									resolver.resolve();
								}
							}
						);

						await Promise.race([
							this.transport.closed,
							o.stillOwner.toPromise()
						]);
						decryptSub.unsubscribe();
						encryptSub.unsubscribe();
						ratchetUpdateSub.unsubscribe();
					}).then(() => {
						this.pendingMessageResolvers = undefined;

						for (const resolver of Array.from(
							pendingMessageResolvers.resolvers.values()
						)) {
							resolver.resolve();
						}
					});
				}
			}
		}).catch(err => {
			debugLogError(() => ({
				castleHandshakeFailure: err,
				castleHandshakeState: this.handshakeState
			}));

			this.abort();
			throw err;
		});
	}
}
