import {config} from '../../config';
import {denullifyAsyncValue} from '../../denullify-async-value';
import {IAsyncValue} from '../../iasync-value';
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
		this.resolveCore	= resolve;
	});

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
	private async handshakeOpenSecret (cyphertext: Uint8Array) : Promise<Uint8Array> {
		const keyPair	= await this.localUser.getKeyPair();
		const secret	= await this.potassium.box.open(cyphertext, keyPair);

		this.potassium.clearMemory(keyPair.privateKey);
		this.potassium.clearMemory(keyPair.publicKey);

		return secret;
	}

	/** @ignore */
	private async handshakeSendSecret (secret: Uint8Array) : Promise<Uint8Array> {
		const remotePublicKey	= await this.remoteUser.getPublicKey();
		const cyphertext		= await this.potassium.box.seal(secret, remotePublicKey);

		this.potassium.clearMemory(remotePublicKey);

		return cyphertext;
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
						let plaintext	= await (await this.core).decrypt(cyphertextBytes);

						/* Part 2 of handshake for Alice */
						if (
							(
								await this.handshakeState.currentStep.getValue()
							) === HandshakeSteps.PostCoreInit
						) {
							const oldPlaintext	= this.potassium.toBytes(plaintext);
							plaintext			= await this.handshakeOpenSecret(oldPlaintext);

							this.potassium.clearMemory(oldPlaintext);
							await this.handshakeState.currentStep.setValue(
								HandshakeSteps.PostMutualVerification
							);
						}

						/* Completion of handshake */
						if (
							(
								await this.handshakeState.currentStep.getValue()
							) === HandshakeSteps.PostMutualVerification
						) {
							await this.connect();
						}

						this.transport.receive(
							cyphertextBytes,
							plaintext,
							await this.remoteUser.getUsername()
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

		const plaintextBytes	= this.potassium.fromString(plaintext);
		const timestampBytes	= new Float64Array([timestamp]);

		let data	= this.potassium.concatMemory(
			true,
			timestampBytes,
			plaintextBytes
		);

		return this.sendLock(async () => {
			let bobHandshakeMutualVerification	= false;

			/* Part 2 of handshake for Bob */
			if (
				(await this.handshakeState.currentStep.getValue()) === HandshakeSteps.PostCoreInit
			) {
				const oldData	= data;
				data			= await this.handshakeSendSecret(oldData);
				this.potassium.clearMemory(oldData);

				bobHandshakeMutualVerification	= true;
			}

			const messageID		= await this.newOutgoingMessageID();
			const cyphertext	= await (await this.core).encrypt(data, messageID);

			this.potassium.clearMemory(data);
			this.transport.send(cyphertext, messageID);

			if (bobHandshakeMutualVerification) {
				await this.handshakeState.currentStep.setValue(
					HandshakeSteps.PostMutualVerification
				);
			}
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

		symmetricRatchetState: ISymmetricRatchetStateMaybe = {
			current: {
				incoming: new LocalAsyncValue(undefined),
				outgoing: new LocalAsyncValue(undefined)
			},
			next: {
				incoming: new LocalAsyncValue(undefined),
				outgoing: new LocalAsyncValue(undefined)
			}
		},

		asymmetricRatchetState: IAsymmetricRatchetState = {
			privateKey: new LocalAsyncValue(undefined),
			publicKey: new LocalAsyncValue(undefined)
		},

		coreLock: LockFunction	= util.lockFunction(),

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
		private readonly receiveLock: LockFunction = util.lockFunction(),

		/** @ignore */
		private readonly sendLock: LockFunction = util.lockFunction()
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

				/* Bootstrap asymmetric ratchet */
				if (initialSecret === undefined) {
					if (this.handshakeState.isAlice) {
						const newInitialSecret	= this.potassium.randomBytes(
							await potassium.ephemeralKeyExchange.secretBytes
						);

						await this.handshakeState.initialSecretCyphertext.setValue(
							await this.handshakeSendSecret(newInitialSecret)
						);

						await this.handshakeState.initialSecret.setValue(newInitialSecret);
					}
					else {
						await this.handshakeState.initialSecret.setValue(
							await this.handshakeOpenSecret(
								await this.handshakeState.initialSecretCyphertext.getValue()
							)
						);
					}
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

					await this.handshakeState.currentStep.setValue(HandshakeSteps.PostCoreInit);

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
