/* tslint:disable:max-file-line-count */

import {BehaviorSubject, Subject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {config} from '../../config';
import {IAsyncList} from '../../iasync-list';
import {IAsyncValue} from '../../iasync-value';
import {LocalAsyncList} from '../../local-async-list';
import {LocalAsyncValue} from '../../local-async-value';
import {LockFunction} from '../../lock-function-type';
import {ICastleRatchetState} from '../../proto';
import {lockFunction} from '../../util/lock';
import {debugLog} from '../../util/log';
import {getTimestamp} from '../../util/time';
import {resolvable, retryUntilSuccessful, sleep} from '../../util/wait';
import {IPotassium} from '../potassium/ipotassium';
import {Core} from './core';
import {HandshakeSteps} from './enums';
import {IHandshakeState} from './ihandshake-state';
import {ILocalUser} from './ilocal-user';
import {IRemoteUser} from './iremote-user';
import {Transport} from './transport';


/**
 * Represents a pairwise (one-to-one) Castle session.
 */
export class PairwiseSession {
	/** @ignore */
	private readonly _CORE					= resolvable<Core>();

	/** @ignore */
	private readonly core: Promise<Core>	= this._CORE.promise;

	/** @ignore */
	private readonly incomingMessageQueue: Subject<{
		cyphertext: Uint8Array;
		newMessageID: number;
		resolve: () => void;
	}>	= new Subject<{
		cyphertext: Uint8Array;
		newMessageID: number;
		resolve: () => void;
	}>();

	/** @ignore */
	private readonly instanceID: Uint8Array					= this.potassium.randomBytes(16);

	/** @ignore */
	private readonly isReceiving: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** @ignore */
	private lastOutgoingMessageID?: number;

	/** @ignore */
	private nextOutgoingMessageID?: number;

	/** @ignore */
	private readonly resolveCore: (core: Core) => void		= this._CORE.resolve;

	/** @ignore */
	private async abort () : Promise<void> {
		debugLog(() => ({castleHandshake: 'abort'}));
		await this.handshakeState.currentStep.setValue(HandshakeSteps.Aborted);
		this.transport.abort();
	}

	/** @ignore */
	private async connect () : Promise<void> {
		debugLog(() => ({castleHandshake: 'connect'}));

		if ((await this.handshakeState.currentStep.getValue()) === HandshakeSteps.Complete) {
			return;
		}

		await this.handshakeState.currentStep.setValue(HandshakeSteps.Complete);
		this.transport.connect();
	}

	/** @ignore */
	private incrementMessageID (messageID: number) : number {
		return messageID === config.maxUint32 ? 0 : messageID + 1;
	}

	/** @ignore */
	private async newOutgoingMessageID () : Promise<{
		messageID: number;
		messageIDBytes: Uint8Array;
	}> {
		if (this.nextOutgoingMessageID === undefined) {
			this.nextOutgoingMessageID	= await this.outgoingMessageID.getValue();
		}

		const messageID	= this.nextOutgoingMessageID;

		this.nextOutgoingMessageID	= this.incrementMessageID(messageID);

		return {
			messageID,
			messageIDBytes: new Uint8Array(new Uint32Array([messageID]).buffer)
		};
	}

	/** @ignore */
	private async processIncomingMessages (
		newMessageID: number,
		cyphertext: Uint8Array
	) : Promise<void> {
		const promises	= {
			incomingMessageID: this.incomingMessageID.getValue(),
			incomingMessages: this.incomingMessages.getValue(),
			incomingMessagesMax: this.incomingMessagesMax.getValue()
		};

		let incomingMessageID	= await promises.incomingMessageID;
		const incomingMessages	= await promises.incomingMessages;
		let incomingMessagesMax	= await promises.incomingMessagesMax;

		const ratchetUpdatePromises: Promise<void>[]	= [];

		debugLog(() => ({pairwiseSessionIncomingMessage: {
			cyphertext,
			incomingMessageID,
			incomingMessages,
			incomingMessagesMax,
			newMessageID
		}}));

		if (newMessageID >= incomingMessageID) {
			if (newMessageID > incomingMessagesMax) {
				incomingMessagesMax	= newMessageID;
			}

			const message	= incomingMessages[newMessageID] || [];

			incomingMessages[newMessageID]	= message;
			message.push(cyphertext);
		}

		while (incomingMessageID <= incomingMessagesMax) {
			const id		= incomingMessageID;
			const message	= incomingMessages[id];

			if (message === undefined) {
				break;
			}

			for (const cyphertextBytes of message) {
				try {
					const {ratchetUpdateComplete}	= await (await this.core).decrypt(
						cyphertextBytes,
						async plaintext => this.decryptedMessageQueue.pushItem(plaintext)
					);

					ratchetUpdatePromises.push(ratchetUpdateComplete);

					++incomingMessageID;
					break;
				}
				catch (err) {
					if (
						(
							await this.handshakeState.currentStep.getValue()
						) !== HandshakeSteps.Complete
					) {
						this.abort();
						throw err;
					}
				}
				finally {
					this.potassium.clearMemory(cyphertextBytes);
				}
			}

			delete incomingMessages[id];
		}

		await Promise.all(ratchetUpdatePromises);

		this.incomingMessageID.setValue(incomingMessageID);
		this.incomingMessages.setValue(incomingMessages);
		this.incomingMessagesMax.setValue(incomingMessagesMax);
	}

	/** @ignore */
	private async processOutgoingMessages (...cyphertexts: Uint8Array[]) : Promise<void> {
		let anyMessagesSent	= false;

		for (const cyphertext of cyphertexts) {
			const messageID	= this.potassium.toDataView(cyphertext).getUint32(0, true);

			if (
				this.lastOutgoingMessageID === undefined ||
				messageID > this.lastOutgoingMessageID
			) {
				debugLog(() => ({pairwiseSessionOutgoingMessageSend: {cyphertext, messageID}}));

				await this.transport.send(cyphertext);

				anyMessagesSent				= true;
				this.lastOutgoingMessageID	= messageID;
			}
		}

		if (!anyMessagesSent || this.lastOutgoingMessageID === undefined) {
			return;
		}

		await this.outgoingMessageID.setValue(
			this.incrementMessageID(
				this.lastOutgoingMessageID
			)
		);
	}

	/** @ignore */
	private async ratchetBootstrapIncoming () : Promise<void> {
		const [
			encryptionKeyPair,
			publicSigningKey,
			cyphertext
		]	= await Promise.all([
			this.localUser.getEncryptionKeyPair(),
			this.remoteUser.getPublicSigningKey(),
			this.handshakeState.initialSecretCyphertext.getValue()
		]);

		const maybeSignedSecret	= await this.potassium.box.open(cyphertext, encryptionKeyPair);

		await this.handshakeState.initialSecret.setValue(
			publicSigningKey ?
				await this.potassium.sign.open(maybeSignedSecret, publicSigningKey) :
				maybeSignedSecret
		);

		await this.handshakeState.currentStep.setValue(HandshakeSteps.PostBootstrap);
	}

	/** @ignore */
	private async ratchetBootstrapOutgoing () : Promise<void> {
		const [
			signingKeyPair,
			publicEncryptionKey,
			initialSecret
		]	= await Promise.all([
			this.localUser.getSigningKeyPair(),
			this.remoteUser.getPublicEncryptionKey(),
			(async () => {
				let secret	= await this.handshakeState.initialSecret.getValue();

				if (!secret) {
					secret	= this.potassium.randomBytes(
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
					await this.potassium.sign.sign(initialSecret, signingKeyPair.privateKey) :
					initialSecret
				,
				publicEncryptionKey
			)
		);

		await this.handshakeState.currentStep.setValue(HandshakeSteps.PostBootstrap);
	}

	/** Receive/decrypt incoming message. */
	public async receive (cyphertext: Uint8Array) : Promise<void> {
		if ((await this.handshakeState.currentStep.getValue()) === HandshakeSteps.Aborted) {
			await this.abort();
			return;
		}

		await this.isReceiving.pipe(filter(b => b), take(1)).toPromise();

		const {promise, resolve}	= resolvable();

		this.incomingMessageQueue.next({
			cyphertext,
			newMessageID: this.potassium.toDataView(cyphertext).getUint32(0, true),
			resolve
		});

		return promise;
	}

	/** Send/encrypt outgoing message. */
	public async send (plaintext: string|ArrayBufferView, timestamp?: number) : Promise<void> {
		if ((await this.handshakeState.currentStep.getValue()) === HandshakeSteps.Aborted) {
			await this.abort();
			return;
		}

		if (timestamp === undefined) {
			timestamp	= await getTimestamp();
		}

		const plaintextBytes	= this.potassium.fromString(plaintext);
		const timestampBytes	= new Float64Array([timestamp]);

		const outgoingMessage	= this.potassium.concatMemory(
			false,
			timestampBytes,
			this.instanceID,
			plaintextBytes
		);

		this.potassium.clearMemory(plaintextBytes);
		this.potassium.clearMemory(timestampBytes);

		await this.outgoingMessageQueue.pushItem(outgoingMessage);
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
		private readonly decryptedMessageQueue: IAsyncList<Uint8Array> = new LocalAsyncList([]),

		/** @ignore */
		private readonly encryptedMessageQueue: IAsyncList<Uint8Array> = new LocalAsyncList([]),

		/** @ignore */
		private readonly incomingMessageID: IAsyncValue<number> = new LocalAsyncValue(0),

		/** @ignore */
		private readonly incomingMessages: IAsyncValue<{[id: number]: Uint8Array[]|undefined}> =
			new LocalAsyncValue<{[id: number]: Uint8Array[]|undefined}>({})
		,

		/** @ignore */
		private readonly incomingMessagesMax: IAsyncValue<number> = new LocalAsyncValue(0),

		/** @ignore */
		private readonly outgoingMessageID: IAsyncValue<number> = new LocalAsyncValue(0),

		/** @ignore */
		private readonly outgoingMessageQueue: IAsyncList<Uint8Array> = new LocalAsyncList([]),

		/** @ignore */
		private readonly lock: LockFunction = lockFunction(),

		ratchetState: IAsyncValue<ICastleRatchetState> = new LocalAsyncValue<ICastleRatchetState>({
			asymmetric: {
				privateKey: new Uint8Array(0),
				publicKey: new Uint8Array(0)
			},
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
		})
	) {
		debugLog(() => ({pairwiseSessionStart: true}));

		retryUntilSuccessful(async () => {
			while (true) {
				const currentStep	= await this.handshakeState.currentStep.getValue();

				if (currentStep === HandshakeSteps.Aborted) {
					this.abort();
					return;
				}

				/* Bootstrap asymmetric ratchet */
				else if (currentStep === HandshakeSteps.Start) {
					debugLog(() => ({castleHandshake: 'start'}));

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
					this.potassium.isEmpty(await ratchetState.getValue().then(o =>
						o.symmetric &&
						o.symmetric.current &&
						o.symmetric.current.incoming
					))
				) {
					debugLog(() => ({castleHandshake: 'post-bootstrap'}));

					const initialSecret	= await this.handshakeState.initialSecret.getValue();

					if (!initialSecret) {
						throw new Error('Invalid HandshakeSteps.PostBootstrap state.');
					}

					const symmetricKeys	= await Core.newSymmetricKeys(
						this.potassium,
						this.handshakeState.isAlice,
						initialSecret
					);

					await ratchetState.setValue({
						asymmetric: {
							privateKey: new Uint8Array(0),
							publicKey: new Uint8Array(0)
						},
						symmetric: {
							current: symmetricKeys,
							next: {
								incoming: new Uint8Array(symmetricKeys.incoming),
								outgoing: new Uint8Array(symmetricKeys.outgoing)
							}
						}
					});
				}

				/* Ready to activate Core */
				else {
					debugLog(() => ({castleHandshake: 'final step'}));

					this.resolveCore(new Core(
						this.potassium,
						this.handshakeState.isAlice,
						await ratchetState.getValue(),
						ratchetState
					));

					await this.connect();

					this.lock(async o => {
						const initialOutgoingMessages	=
							await this.encryptedMessageQueue.getValue()
						;

						if (!o.stillOwner.value) {
							return;
						}

						await this.processOutgoingMessages(...initialOutgoingMessages);

						if (!o.stillOwner.value) {
							return;
						}

						const receiveLock	= lockFunction();
						const sendLock		= lockFunction();

						const receiveCyphertextSub	= this.incomingMessageQueue.subscribe(
							async ({cyphertext, newMessageID, resolve}) => receiveLock(async () => {
								this.transport.logCyphertext(this.remoteUser.username, cyphertext);
								await this.processIncomingMessages(newMessageID, cyphertext);
								resolve();
							})
						);

						const receivePlaintextSub	= this.decryptedMessageQueue.subscribeAndPop(
							async plaintext => {
								debugLog(() => ({pairwiseSessionDecrypted: {plaintext}}));
								await this.transport.receive(plaintext, this.remoteUser.username);
							}
						);

						const sendCyphertextSub		= this.encryptedMessageQueue.subscribeAndPop(
							async cyphertext => this.processOutgoingMessages(cyphertext)
						);

						const sendPlaintextSub		= this.outgoingMessageQueue.subscribeAndPop(
							async message => sendLock(async () => {
								const {messageID, messageIDBytes}	=
									await this.newOutgoingMessageID()
								;

								await (await this.core).encrypt(
									message,
									messageIDBytes,
									async cyphertext => {
										debugLog(() => ({pairwiseSessionOutgoingMessageQueue: {
											cyphertext,
											message,
											messageID
										}}));

										return this.encryptedMessageQueue.pushItem(
											this.potassium.concatMemory(
												true,
												messageIDBytes,
												cyphertext
											)
										);
									}
								);
							})
						);

						this.isReceiving.next(true);
						await Promise.race([this.transport.closed, o.stillOwner.toPromise()]);
						this.isReceiving.next(false);
						await sleep();
						receiveCyphertextSub.unsubscribe();
						receivePlaintextSub.unsubscribe();
						sendCyphertextSub.unsubscribe();
						sendPlaintextSub.unsubscribe();
					});

					return;
				}
			}
		}).catch(err => {
			this.abort();
			throw err;
		});
	}
}
