import {IAsyncValue} from '../../iasync-value';
import {LocalAsyncValue} from '../../local-async-value';
import {LockFunction} from '../../lock-function-type';
import {util} from '../../util';
import {IPotassium} from '../potassium/ipotassium';
import {Core} from './core';
import {ILocalUser} from './ilocal-user';
import {IRemoteUser} from './iremote-user';
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
	private isAborted: boolean;

	/** @ignore */
	private isConnected: boolean;

	/** @ignore */
	private localUser?: ILocalUser;

	/** @ignore */
	private remoteUser?: IRemoteUser;

	/** @ignore */
	private remoteUsername: string;

	/** @ignore */
	private resolveCore: (core: Core) => void;

	/** @ignore */
	private abort () : void {
		if (this.isAborted) {
			return;
		}

		this.isAborted	= true;
		this.transport.abort();
	}

	/** @ignore */
	private connect () : void {
		if (this.isConnected) {
			return;
		}

		this.isConnected	= true;
		this.transport.connect();
	}

	/** @ignore */
	private async handshakeOpenSecret (cyphertext: Uint8Array) : Promise<Uint8Array> {
		try {
			if (!this.localUser) {
				throw new Error('Local user not found.');
			}

			const keyPair	= await this.localUser.getKeyPair();
			const secret	= await this.potassium.box.open(cyphertext, keyPair);

			this.potassium.clearMemory(keyPair.privateKey);
			this.potassium.clearMemory(keyPair.publicKey);

			this.localUser	= undefined;

			return secret;
		}
		catch (err) {
			throw new Error(
				`handshakeOpenSecret failed: ${err ? err.message : 'undefined'}` +
				`\n\ncyphertext: ${this.potassium.toBase64(cyphertext)}`
			);
		}
	}

	/** @ignore */
	private async handshakeSendSecret (secret: Uint8Array) : Promise<Uint8Array> {
		if (!this.remoteUser) {
			throw new Error('Remote user not found.');
		}

		const remotePublicKey	= await this.remoteUser.getPublicKey();

		const cyphertext		= await this.potassium.box.seal(
			secret,
			remotePublicKey
		);

		this.potassium.clearMemory(remotePublicKey);

		this.remoteUser	= undefined;

		return cyphertext;
	}

	/** @ignore */
	private async newOutgoingMessageId () : Promise<Uint8Array> {
		const outgoingMessageId	= await this.outgoingMessageId.getValue();
		this.outgoingMessageId.setValue(outgoingMessageId + 1);
		return new Uint8Array(new Float64Array([outgoingMessageId]).buffer);
	}

	/** Receive/decrypt incoming message. */
	public async receive (cyphertext: string) : Promise<void> {
		if (this.isAborted) {
			return;
		}

		let newMessageBytes: Uint8Array|undefined;
		let newMessageId: number|undefined;

		try {
			newMessageBytes	= this.potassium.fromBase64(cyphertext);

			if (this.transport.cyphertextIntercepters.length > 0) {
				const cyphertextIntercepter	= this.transport.cyphertextIntercepters.shift();

				if (cyphertextIntercepter) {
					cyphertextIntercepter(newMessageBytes);
					return;
				}
			}

			newMessageId	= new DataView(newMessageBytes.buffer).getFloat64(0, true);
		}
		catch (_) {}

		return this.receiveLock(async () => {
			const promises	= {
				incomingMessageId: this.incomingMessageId.getValue(),
				incomingMessages: this.incomingMessages.getValue(),
				incomingMessagesMax: this.incomingMessagesMax.getValue()
			};
			let incomingMessageId	= await promises.incomingMessageId;
			const incomingMessages	= await promises.incomingMessages;
			let incomingMessagesMax	= await promises.incomingMessagesMax;

			if (
				newMessageBytes !== undefined &&
				newMessageId !== undefined &&
				newMessageId >= incomingMessageId
			) {
				if (newMessageId > incomingMessagesMax) {
					incomingMessagesMax	= newMessageId;
				}

				const message					= incomingMessages[newMessageId] || [];
				incomingMessages[newMessageId]	= message;
				message.push(newMessageBytes);
			}

			while (incomingMessageId <= incomingMessagesMax) {
				const id		= incomingMessageId;
				const message	= incomingMessages[id];

				if (message === undefined) {
					break;
				}

				for (const cyphertextBytes of message) {
					try {
						let plaintext	= await (await this.core).decrypt(cyphertextBytes);

						/* Part 2 of handshake for Alice */
						if (this.localUser) {
							const oldPlaintext	= this.potassium.toBytes(plaintext);
							const plaintextData	= await this.handshakeOpenSecret(oldPlaintext);

							plaintext	= new Uint8Array(
								plaintextData.buffer,
								plaintextData.byteOffset,
								plaintextData.byteLength
							);

							this.potassium.clearMemory(oldPlaintext);
						}

						/* Completion of handshake */
						if (!this.remoteUser) {
							this.connect();
						}

						this.transport.receive(cyphertextBytes, plaintext, this.remoteUsername);

						++incomingMessageId;
						break;
					}
					catch (err) {
						if (!this.isConnected) {
							this.abort();
							throw err;
						}
					}
					finally {
						this.potassium.clearMemory(cyphertextBytes);
					}
				}

				incomingMessages[id]	= undefined;
			}

			this.incomingMessageId.setValue(incomingMessageId);
			this.incomingMessages.setValue(incomingMessages);
			this.incomingMessagesMax.setValue(incomingMessagesMax);
		});
	}

	/** Send/encrypt outgoing message. */
	public async send (plaintext: string, timestamp?: number) : Promise<void> {
		if (this.isAborted) {
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
			/* Part 2 of handshake for Bob */
			if (this.remoteUser) {
				const oldData	= data;
				data			= await this.handshakeSendSecret(oldData);
				this.potassium.clearMemory(oldData);
			}

			const messageId		= await this.newOutgoingMessageId();
			const cyphertext	= await (await this.core).encrypt(data, messageId);

			this.potassium.clearMemory(data);
			this.transport.send(cyphertext, messageId);
		});
	}

	constructor (
		/** @ignore */
		private readonly potassium: IPotassium,

		/** @ignore */
		private readonly transport: Transport,

		localUser: ILocalUser,

		remoteUser: IRemoteUser,

		isAlice: boolean,

		/** @ignore */
		private readonly incomingMessageId: IAsyncValue<number> = new LocalAsyncValue(0),

		/** @ignore */
		private readonly incomingMessages: IAsyncValue<{[id: number]: Uint8Array[]|undefined}> =
			new LocalAsyncValue<{[id: number]: Uint8Array[]|undefined}>({})
		,

		/** @ignore */
		private readonly incomingMessagesMax: IAsyncValue<number> = new LocalAsyncValue(0),

		/** @ignore */
		private readonly outgoingMessageId: IAsyncValue<number> = new LocalAsyncValue(0),

		/** @ignore */
		private readonly receiveLock: LockFunction = util.lockFunction(),

		/** @ignore */
		private readonly sendLock: LockFunction = util.lockFunction()
	) { (async () => {
		try {
			this.localUser	= localUser;
			this.remoteUser	= remoteUser;

			const aliceRemoteSecret	= !isAlice ? this.localUser.getRemoteSecret() : undefined;

			this.remoteUsername		= await this.remoteUser.getUsername();

			await this.localUser.getKeyPair();

			let secret: Uint8Array;
			if (aliceRemoteSecret === undefined) {
				secret	= this.potassium.randomBytes(
					await potassium.ephemeralKeyExchange.secretBytes
				);

				this.transport.send(await this.handshakeSendSecret(secret));
			}
			else {
				secret	= await this.handshakeOpenSecret(await aliceRemoteSecret);

				this.send('');
			}

			const symmetricKeys	= await Core.newSymmetricKeys(this.potassium, isAlice, secret);

			this.resolveCore(new Core(
				this.potassium,
				isAlice,
				{
					current: {
						incoming: new LocalAsyncValue(symmetricKeys.incoming),
						outgoing: new LocalAsyncValue(symmetricKeys.outgoing)
					},
					next: {
						incoming: new LocalAsyncValue(new Uint8Array(symmetricKeys.incoming)),
						outgoing: new LocalAsyncValue(new Uint8Array(symmetricKeys.outgoing))
					}
				}
			));
		}
		catch (err) {
			this.abort();
			throw err;
		}
	})(); }
}
