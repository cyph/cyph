import {config} from '../../config';
import {util} from '../../util';
import {Potassium} from '../potassium';
import {Core} from './core';
import {ILocalUser} from './ilocal-user';
import {IRemoteUser} from './iremote-user';
import {Transport} from './transport';


/**
 * Represents a pairwise (one-to-one) Castle session.
 */
export class PairwiseSession {
	/** @ignore */
	private core: Core;

	/** @ignore */
	private incomingMessageId: number	= 0;

	/** @ignore */
	private readonly incomingMessages: Map<number, Uint8Array[]>	=
		new Map<number, Uint8Array[]>()
	;

	/** @ignore */
	private incomingMessagesMax: number	= 0;

	/** @ignore */
	private isAborted: boolean;

	/** @ignore */
	private isConnected: boolean;

	/** @ignore */
	private localUser: ILocalUser|undefined;

	/** @ignore */
	private outgoingMessageId: number	= 0;

	/** @ignore */
	private readonly receiveLock: {}	= {};

	/** @ignore */
	private remoteUser: IRemoteUser|undefined;

	/** @ignore */
	private remoteUsername: string;

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
		if (!this.localUser) {
			throw new Error('Local user not found.');
		}

		const keyPair	= await this.localUser.getKeyPair();

		const secret	= await this.potassium.box.open(
			cyphertext,
			keyPair
		);

		this.potassium.clearMemory(keyPair.privateKey);
		this.potassium.clearMemory(keyPair.publicKey);

		this.localUser	= undefined;

		return secret;
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
	private newMessageId () : Uint8Array {
		return new Uint8Array(new Float64Array([
			this.outgoingMessageId++
		]).buffer);
	}

	/**
	 * Receive/decrypt incoming message.
	 * @param cyphertext
	 */
	public receive (cyphertext: string) : void {
		if (this.isAborted) {
			return;
		}

		try {
			const cyphertextBytes: Uint8Array	=
				this.potassium.fromBase64(cyphertext)
			;

			if (this.transport.cyphertextIntercepters.length > 0) {
				const cyphertextIntercepter	= this.transport.cyphertextIntercepters.shift();

				if (cyphertextIntercepter) {
					cyphertextIntercepter(cyphertextBytes);
					return;
				}
			}

			const id: number	= new Float64Array(cyphertextBytes.buffer, 0, 1)[0];

			if (id >= this.incomingMessageId) {
				this.incomingMessagesMax	= Math.max(
					this.incomingMessagesMax,
					id
				);

				util.getOrSetDefault(
					this.incomingMessages,
					id,
					() => []
				).push(
					cyphertextBytes
				);
			}
		}
		catch (_) {}

		if (!this.core) {
			return;
		}

		util.lock(this.receiveLock, async () => {
			while (this.incomingMessageId <= this.incomingMessagesMax) {
				const incomingMessages	= this.incomingMessages.get(this.incomingMessageId);

				if (incomingMessages === undefined) {
					break;
				}

				let success	= false;

				for (const cyphertextBytes of incomingMessages) {
					if (!success) {
						try {
							let plaintext: DataView	= await this.core.decrypt(
								cyphertextBytes
							);

							/* Part 2 of handshake for Alice */
							if (this.localUser) {
								const oldPlaintext	= this.potassium.toBytes(plaintext);

								plaintext	= new DataView((
									await this.handshakeOpenSecret(oldPlaintext)
								).buffer);

								this.potassium.clearMemory(oldPlaintext);
							}

							/* Completion of handshake for Bob */
							if (!this.remoteUser) {
								this.connect();
							}

							this.transport.receive(
								cyphertextBytes,
								plaintext,
								this.remoteUsername
							);

							success	= true;
						}
						catch (_) {
							if (!this.isConnected) {
								this.abort();
							}
						}
					}

					this.potassium.clearMemory(cyphertextBytes);
				}

				this.incomingMessages.delete(this.incomingMessageId);

				if (!success) {
					break;
				}

				++this.incomingMessageId;
			}
		});
	}

	/**
	 * Send/encrypt outgoing message.
	 * @param plaintext
	 * @param timestamp
	 */
	public async send (
		plaintext: string,
		timestamp: number = util.timestamp()
	) : Promise<void> {
		if (this.isAborted || !this.core) {
			return;
		}

		const plaintextBytes: Uint8Array	= this.potassium.fromString(plaintext);

		const id: Float64Array				= new Float64Array([
			util.random(config.maxSafeUint)
		]);

		const timestampBytes: Float64Array	= new Float64Array([
			timestamp
		]);

		const numBytes: Float64Array		= new Float64Array([
			plaintextBytes.length
		]);

		const numChunks: Float64Array		= new Float64Array([
			Math.ceil(plaintextBytes.length / Transport.chunkLength)
		]);

		const i	= new Float64Array(1);
		while (
			i[0] < plaintextBytes.length ||
			(i[0] === 0 && plaintextBytes.length === 0)
		) {
			const chunk: Uint8Array	= new Uint8Array(
				plaintextBytes.buffer,
				i[0],
				Math.min(
					Transport.chunkLength,
					plaintextBytes.length - i[0]
				)
			);

			let data: Uint8Array	= this.potassium.concatMemory(
				false,
				id,
				timestampBytes,
				numBytes,
				numChunks,
				i,
				chunk
			);

			/* Part 2 of handshake for Bob */
			if (this.remoteUser) {
				const oldData	= data;
				data			= await this.handshakeSendSecret(oldData);
				this.potassium.clearMemory(oldData);
			}

			const messageId		= this.newMessageId();
			const cyphertext	= await this.core.encrypt(data, messageId);

			this.potassium.clearMemory(data);

			this.transport.send(cyphertext, messageId);

			i[0] += Transport.chunkLength;
		}

		this.potassium.clearMemory(plaintextBytes);
		this.potassium.clearMemory(id);
		this.potassium.clearMemory(timestampBytes);
		this.potassium.clearMemory(numBytes);
		this.potassium.clearMemory(numChunks);
		this.potassium.clearMemory(i);
	}

	constructor (
		/** @ignore */
		private readonly potassium: Potassium,

		/** @ignore */
		private readonly transport: Transport,

		localUser: ILocalUser,

		remoteUser: IRemoteUser,

		isAlice: boolean
	) { (async () => {
		try {
			this.localUser	= localUser;
			this.remoteUser	= remoteUser;

			this.remoteUsername	= this.remoteUser.getUsername();

			await this.localUser.getKeyPair();

			let secret: Uint8Array;
			if (isAlice) {
				secret	= this.potassium.randomBytes(
					potassium.ephemeralKeyExchange.secretBytes
				);

				this.transport.send(await this.handshakeSendSecret(secret));
			}
			else {
				secret	= await this.handshakeOpenSecret(
					await this.localUser.getRemoteSecret()
				);
			}

			this.core	= new Core(
				this.potassium,
				isAlice,
				[await Core.newKeys(this.potassium, isAlice, secret)]
			);

			if (isAlice) {
				this.connect();
			}
			else {
				this.send('');
			}
		}
		catch (_) {
			this.abort();
		}
	})(); }
}
