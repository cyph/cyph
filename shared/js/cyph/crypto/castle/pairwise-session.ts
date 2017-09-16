import {config} from '../../config';
import {denullifyAsyncValue} from '../../denullify-async-value';
import {IAsyncList} from '../../iasync-list';
import {IAsyncValue} from '../../iasync-value';
import {LocalAsyncList} from '../../local-async-list';
import {LocalAsyncValue} from '../../local-async-value';
import {LockFunction} from '../../lock-function-type';
import {util} from '../../util';
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
	private readonly core: Promise<Core>	= new Promise<Core>(resolve => {
		this.resolveCore	= core => {
			this.coreResolved	= true;
			resolve(core);
		};
	});

	/** @ignore */
	private coreResolved: boolean	= false;

	/** @ignore */
	private resolveCore: (core: Core) => void;

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

		return await this.potassium.box.open(cyphertext, keyPair);
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

		const newMessageID	= this.potassium.toDataView(cyphertext).getUint32(0, true);

		return this.receiveLock(async () => {
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

				const message					= incomingMessages[newMessageID] || [];
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
						const plaintext	= await (await this.core).decrypt(cyphertextBytes);

						this.transport.receive(
							cyphertextBytes,
							plaintext,
							this.remoteUser.username
						);

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
		});
	}

	/** Send/encrypt outgoing message. */
	public async send (plaintext: string|ArrayBufferView, timestamp?: number) : Promise<void> {
		if ((await this.handshakeState.currentStep.getValue()) === HandshakeSteps.Aborted) {
			await this.abort();
			return;
		}

		if (timestamp === undefined) {
			timestamp	= await util.timestamp();
		}

		const fullPlaintext	= this.potassium.concatMemory(
			true,
			new Float64Array([timestamp]),
			this.potassium.fromString(plaintext)
		);

		if (!this.coreResolved) {
			await this.outgoingMessageQueue.pushValue(fullPlaintext);
			return;
		}

		return this.sendLock(async () => {
			const messageID		= await this.newOutgoingMessageID();
			const cyphertext	= await (await this.core).encrypt(fullPlaintext, messageID);

			this.potassium.clearMemory(fullPlaintext);
			this.transport.send(this.potassium.concatMemory(
				true,
				messageID,
				cyphertext
			));
		});
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
		private readonly receiveLock: LockFunction = util.lockFunction(),

		/** @ignore */
		private readonly sendLock: LockFunction = util.lockFunction(),

		coreLock: LockFunction	= util.lockFunction(),

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
	) { (async () => {
		try {
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
						asymmetricRatchetState,
						coreLock
					));

					await this.connect();

					await this.outgoingMessageQueue.updateValue(async outgoingMessageQueue => {
						for (const fullPlaintext of outgoingMessageQueue) {
							this.send(
								this.potassium.toBytes(fullPlaintext, 8),
								this.potassium.toDataView(fullPlaintext).getFloat64(0, true)
							);
						}

						return [];
					});

					return;
				}
			}
		}
		catch (err) {
			this.abort();
			throw err;
		}
	})(); }
}
