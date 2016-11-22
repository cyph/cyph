import {Config} from '../../config';
import {Util} from '../../util';
import {Potassium} from '../potassium';
import {Core} from './core';
import {ILocalUser} from './ilocaluser';
import {IRemoteUser} from './iremoteuser';
import {Transport} from './transport';


/**
 * Represents a pairwise (one-to-one) Castle session.
 */
export class PairwiseSession {
	/** @ignore */
	private incomingMessageId: number						= 0;

	/** @ignore */
	private incomingMessagesMax: number						= 0;

	/** @ignore */
	private outgoingMessageId: number						= 0;

	/** @ignore */
	private receiveLock: {}									= {};

	/** @ignore */
	private incomingMessages: {[id: number]: Uint8Array[]}	= {};

	/** @ignore */
	private core: Core;

	/** @ignore */
	private isAborted: boolean;

	/** @ignore */
	private isConnected: boolean;

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
		const keyPair	= await this.localUser.getKeyPair();

		const secret	= await this.potassium.box.open(
			cyphertext,
			keyPair
		);

		Potassium.clearMemory(keyPair.privateKey);
		Potassium.clearMemory(keyPair.publicKey);

		this.localUser	= null;

		return secret;
	}

	/** @ignore */
	private async handshakeSendSecret (secret: Uint8Array) : Promise<Uint8Array> {
		const remotePublicKey	= await this.remoteUser.getPublicKey();

		const cyphertext		= await this.potassium.box.seal(
			secret,
			remotePublicKey
		);

		Potassium.clearMemory(remotePublicKey);

		this.remoteUser	= null;

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
				Potassium.fromBase64(cyphertext)
			;

			if (this.transport.cyphertextIntercepters.length > 0) {
				this.transport.cyphertextIntercepters.shift()(cyphertextBytes);
				return;
			}

			const id: number	= new Float64Array(cyphertextBytes.buffer, 0, 1)[0];

			if (id >= this.incomingMessageId) {
				this.incomingMessagesMax	= Math.max(
					this.incomingMessagesMax,
					id
				);

				if (!this.incomingMessages[id]) {
					this.incomingMessages[id]	= [];
				}

				this.incomingMessages[id].push(cyphertextBytes);
			}
		}
		catch (_) {}

		if (!this.core) {
			return;
		}

		Util.lock(this.receiveLock, async () => {
			while (
				this.incomingMessageId <= this.incomingMessagesMax &&
				this.incomingMessages[this.incomingMessageId]
			) {
				let success: boolean;

				for (
					let cyphertextBytes of
					this.incomingMessages[this.incomingMessageId]
				) {
					if (!success) {
						try {
							let plaintext: DataView	= await this.core.decrypt(
								cyphertextBytes
							);

							/* Part 2 of handshake for Alice */
							if (this.localUser) {
								const oldPlaintext	= Potassium.toBytes(plaintext);

								plaintext	= new DataView((
									await this.handshakeOpenSecret(oldPlaintext)
								).buffer);

								Potassium.clearMemory(oldPlaintext);
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

					Potassium.clearMemory(cyphertextBytes);
				}

				this.incomingMessages[this.incomingMessageId]	= null;

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
		timestamp: number = Util.timestamp()
	) : Promise<void> {
		if (this.isAborted || !this.core) {
			return;
		}

		const plaintextBytes: Uint8Array	= Potassium.fromString(plaintext);

		const id: Float64Array				= new Float64Array([
			Util.random(Config.maxSafeUint)
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

			let data: Uint8Array	= Potassium.concatMemory(
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
				Potassium.clearMemory(oldData);
			}

			const messageId		= this.newMessageId();
			const cyphertext	= await this.core.encrypt(data, messageId);

			Potassium.clearMemory(data);

			this.transport.send(cyphertext, messageId);

			i[0] += Transport.chunkLength;
		}

		Potassium.clearMemory(plaintextBytes);
		Potassium.clearMemory(id);
		Potassium.clearMemory(timestampBytes);
		Potassium.clearMemory(numBytes);
		Potassium.clearMemory(numChunks);
		Potassium.clearMemory(i);
	}

	constructor (
		/** @ignore */
		private potassium: Potassium,

		/** @ignore */
		private transport: Transport,

		/** @ignore */
		private localUser: ILocalUser,

		/** @ignore */
		private remoteUser: IRemoteUser,

		isAlice: boolean
	) { (async () => {
		try {
			this.remoteUsername	= this.remoteUser.getUsername();

			await this.localUser.getKeyPair();

			let secret: Uint8Array;
			if (isAlice) {
				secret	= Potassium.randomBytes(
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
