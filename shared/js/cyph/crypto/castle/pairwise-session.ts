import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {config} from '../../config';
import {denullifyAsyncValue} from '../../denullify-async-value';
import {IAsyncList} from '../../iasync-list';
import {IAsyncValue} from '../../iasync-value';
import {LocalAsyncList} from '../../local-async-list';
import {LocalAsyncValue} from '../../local-async-value';
import {LockFunction} from '../../lock-function-type';
import {lockFunction} from '../../util/lock';
import {getTimestamp} from '../../util/time';
import {resolvable, retryUntilSuccessful, sleep} from '../../util/wait';
import {IPotassium} from '../potassium/ipotassium';
import {Core} from './core';
import {HandshakeSteps} from './enums';
import {IAsymmetricRatchetState} from './iasymmetric-ratchet-state';
import {IHandshakeState} from './ihandshake-state';
import {ILocalUser} from './ilocal-user';
import {IRemoteUser} from './iremote-user';
import {ISymmetricRatchetStateMaybe} from './isymmetric-ratchet-state-maybe';
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
	private readonly isReceiving: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** @ignore */
	private readonly resolveCore: (core: Core) => void		= this._CORE.resolve;

	/** @ignore */
	private async abort () : Promise<void> {
		await this.handshakeState.currentStep.setValue(HandshakeSteps.Aborted);
		this.transport.abort();
	}

	/** @ignore */
	private async connect () : Promise<void> {
		if ((await this.handshakeState.currentStep.getValue()) === HandshakeSteps.Complete) {
			return;
		}

		await this.handshakeState.currentStep.setValue(HandshakeSteps.Complete);
		this.transport.connect();
	}

	/** @ignore */
	private async newOutgoingMessageID () : Promise<Uint8Array> {
		const outgoingMessageID	= await this.outgoingMessageID.getValue();
		this.outgoingMessageID.setValue(
			outgoingMessageID === config.maxUint32 ?
				0 :
				outgoingMessageID + 1
		);
		return new Uint8Array(new Uint32Array([outgoingMessageID]).buffer);
	}

	/** @ignore */
	private async processIncomingMessages (
		newMessageID: number,
		cyphertext: Uint8Array
	) : Promise<{
		cyphertextBytes: Uint8Array;
		plaintext: Uint8Array;
		username: Observable<string>;
	}[]> {
		const promises	= {
			incomingMessageID: this.incomingMessageID.getValue(),
			incomingMessages: this.incomingMessages.getValue(),
			incomingMessagesMax: this.incomingMessagesMax.getValue()
		};

		let incomingMessageID	= await promises.incomingMessageID;
		const incomingMessages	= await promises.incomingMessages;
		let incomingMessagesMax	= await promises.incomingMessagesMax;

		if (newMessageID >= incomingMessageID) {
			if (newMessageID > incomingMessagesMax) {
				incomingMessagesMax	= newMessageID;
			}

			const message	= incomingMessages[newMessageID] || [];

			incomingMessages[newMessageID]	= message;
			message.push(cyphertext);
		}

		const decryptedMessages: {
			cyphertextBytes: Uint8Array;
			plaintext: Uint8Array;
			username: Observable<string>;
		}[]	=
			[]
		;

		while (incomingMessageID <= incomingMessagesMax) {
			const id		= incomingMessageID;
			const message	= incomingMessages[id];

			if (message === undefined) {
				break;
			}

			for (const cyphertextBytes of message) {
				try {
					const plaintext	= await (await this.core).decrypt(cyphertextBytes);

					decryptedMessages.push({
						cyphertextBytes,
						plaintext,
						username: this.remoteUser.username
					});

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

		this.incomingMessageID.setValue(incomingMessageID);
		this.incomingMessages.setValue(incomingMessages);
		this.incomingMessagesMax.setValue(incomingMessagesMax);

		return decryptedMessages;
	}

	/** @ignore */
	private async ratchetBootstrapComplete (
		initialSecretAlice: Uint8Array,
		initialSecretBob: Uint8Array
	) : Promise<void> {
		await this.handshakeState.initialSecret.setValue(
			await this.potassium.hash.deriveKey(
				this.potassium.concatMemory(
					true,
					initialSecretAlice,
					initialSecretBob
				),
				await this.potassium.ephemeralKeyExchange.secretBytes
			)
		);

		await this.handshakeState.currentStep.setValue(HandshakeSteps.PostBootstrap);
	}

	/** @ignore */
	private async ratchetBootstrapIncoming (
		initialSecretCyphertext: IAsyncValue<Uint8Array>
	) : Promise<Uint8Array> {
		const cyphertext	= await initialSecretCyphertext.getValue();
		const keyPair		= await this.localUser.getKeyPair();

		return this.potassium.box.open(cyphertext, keyPair);
	}

	/** @ignore */
	private async ratchetBootstrapOutgoing (
		initialSecretCyphertext: IAsyncValue<Uint8Array>
	) : Promise<Uint8Array> {
		const initialSecretPart	= this.potassium.randomBytes(
			await this.potassium.ephemeralKeyExchange.secretBytes
		);

		await initialSecretCyphertext.setValue(
			await this.potassium.box.seal(
				initialSecretPart,
				await this.remoteUser.getPublicKey()
			)
		);

		return initialSecretPart;
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

		await this.outgoingMessageQueue.pushValue(this.potassium.concatMemory(
			true,
			new Float64Array([timestamp]),
			this.potassium.fromString(plaintext)
		));
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
		private readonly receiveLock: LockFunction = lockFunction(),

		/** @ignore */
		private readonly sendLock: LockFunction = lockFunction(),

		asymmetricRatchetState: IAsymmetricRatchetState = {
			privateKey: new LocalAsyncValue(undefined),
			publicKey: new LocalAsyncValue(undefined)
		},

		symmetricRatchetState: ISymmetricRatchetStateMaybe = {
			current: {
				incoming: new LocalAsyncValue(undefined),
				outgoing: new LocalAsyncValue(undefined)
			},
			next: {
				incoming: new LocalAsyncValue(undefined),
				outgoing: new LocalAsyncValue(undefined)
			}
		}
	) {
		retryUntilSuccessful(async () => {
			await this.localUser.getKeyPair();

			while (true) {
				const initialSecret			=
					await this.handshakeState.initialSecret.getValue()
				;

				const symmetricRatchetReady	=
					(await symmetricRatchetState.current.incoming.getValue()) !== undefined
				;

				/* Start bootstrapping asymmetric ratchet */
				if (initialSecret === undefined) {
					await this.handshakeState.initialSecret.setValue(
						this.handshakeState.isAlice ?
							await this.ratchetBootstrapOutgoing(
								this.handshakeState.initialSecretAliceCyphertext
							) :
							await this.ratchetBootstrapIncoming(
								this.handshakeState.initialSecretAliceCyphertext
							)
					);
				}

				/* Second half of ratchet bootstrap for mutual public key verification */
				else if (
					(await this.handshakeState.currentStep.getValue()) === HandshakeSteps.Start
				) {
					await this.ratchetBootstrapComplete(
						initialSecret,
						this.handshakeState.isAlice ?
							await this.ratchetBootstrapIncoming(
								this.handshakeState.initialSecretBobCyphertext
							) :
							await this.ratchetBootstrapOutgoing(
								this.handshakeState.initialSecretBobCyphertext
							)
					);
				}

				/* Initialize symmetric ratchet */
				else if (!symmetricRatchetReady) {
					const symmetricKeys	= await Core.newSymmetricKeys(
						this.potassium,
						this.handshakeState.isAlice,
						initialSecret
					);

					await Promise.all([
						symmetricRatchetState.current.incoming.setValue(symmetricKeys.incoming),
						symmetricRatchetState.current.outgoing.setValue(symmetricKeys.outgoing),
						symmetricRatchetState.next.incoming.setValue(
							new Uint8Array(symmetricKeys.incoming)
						),
						symmetricRatchetState.next.outgoing.setValue(
							new Uint8Array(symmetricKeys.outgoing)
						)
					]);
				}

				/* Ready to activate Core */
				else {
					const [
						currentIncoming,
						currentOutgoing,
						nextIncoming,
						nextOutgoing
					]	= await Promise.all([
						denullifyAsyncValue(symmetricRatchetState.current.incoming),
						denullifyAsyncValue(symmetricRatchetState.current.outgoing),
						denullifyAsyncValue(symmetricRatchetState.next.incoming),
						denullifyAsyncValue(symmetricRatchetState.next.outgoing)
					]);

					this.resolveCore(new Core(
						this.potassium,
						this.handshakeState.isAlice,
						{
							current: {incoming: currentIncoming, outgoing: currentOutgoing},
							next: {incoming: nextIncoming, outgoing: nextOutgoing}
						},
						asymmetricRatchetState
					));

					await this.connect();

					this.receiveLock(async o => {
						const lock					= lockFunction();
						const sessionReceiveLock	= lockFunction();

						const sub	= this.incomingMessageQueue.subscribe(
							async ({cyphertext, newMessageID, resolve}) => lock(async () => {
								const decryptedMessages	= await this.processIncomingMessages(
									newMessageID,
									cyphertext
								);

								sessionReceiveLock(async () => {
									for (const {
										cyphertextBytes,
										plaintext,
										username
									} of decryptedMessages) {
										await this.transport.receive(
											cyphertextBytes,
											plaintext,
											username
										);
									}

									resolve();
								});
							})
						);

						this.isReceiving.next(true);
						await Promise.race([this.transport.closed, o.stillOwner.toPromise()]);
						this.isReceiving.next(false);
						await sleep();
						sub.unsubscribe();
					});

					this.sendLock(async o => {
						const lock	= lockFunction();

						const sub	= this.outgoingMessageQueue.subscribeAndPop(async message =>
							lock(async () => {
								const messageID		= await this.newOutgoingMessageID();

								const cyphertext	= await (await this.core).encrypt(
									message,
									messageID
								);

								await this.transport.send(this.potassium.concatMemory(
									true,
									messageID,
									cyphertext
								));
							})
						);

						await Promise.race([this.transport.closed, o.stillOwner.toPromise()]);
						sub.unsubscribe();
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
