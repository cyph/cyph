import {CastleCore} from 'castlecore';
import {ICastle} from 'icastle';
import {Potassium} from 'potassium';
import {Config} from 'cyph/config';
import {Util} from 'cyph/util';
import {CastleEvents, Events, State, Users} from 'session/enums';
import {ISession} from 'session/isession';


export class Castle implements ICastle {
	private static chunkLength: number	= 8388608;


	private incomingMessageId: number				= 0;
	private incomingMessagesMax: number				= 0;
	private lastIncomingMessageTimestamp: number	= 0;
	private receiveLock: {}							= {};
	private sendQueue: string[]						= [];

	private incomingMessages: {
		[id: number] : Uint8Array[]
	}	= {};

	private receivedMessages: {
		[id: number] : { data: Uint8Array; totalChunks: number; }
	}	= {};

	private core: CastleCore;

	private async sendHelper (message: string, shouldLock: boolean = true) : Promise<void> {
		if (this.sendQueue) {
			this.sendQueue.push(message);
		}
		else {
			const messageBytes: Uint8Array	= Potassium.fromString(message);

			const id: Float64Array			= new Float64Array([
				Util.random(Config.maxSafeUint)
			]);

			const timestamp: Float64Array	= new Float64Array([
				Util.timestamp()
			]);

			const numBytes: Float64Array	= new Float64Array([
				messageBytes.length
			]);

			const numChunks: Float64Array	= new Float64Array([
				Math.ceil(messageBytes.length / Castle.chunkLength)
			]);

			const i = new Float64Array(1);
			for (; i[0] < messageBytes.length ; i[0] += Castle.chunkLength) {
				const chunk: Uint8Array	= new Uint8Array(
					messageBytes.buffer,
					i[0],
					Math.min(
						Castle.chunkLength,
						messageBytes.length - i[0]
					)
				);

				const data: Uint8Array	= Potassium.concatMemory(
					false,
					id,
					timestamp,
					numBytes,
					numChunks,
					i,
					chunk
				);

				try {
					await this.core.send(data, shouldLock);
				}
				finally {
					Potassium.clearMemory(data);
				}
			}

			Potassium.clearMemory(messageBytes);
			Potassium.clearMemory(id);
			Potassium.clearMemory(timestamp);
			Potassium.clearMemory(numBytes);
			Potassium.clearMemory(numChunks);
			Potassium.clearMemory(i);
		}
	}

	public receive (message: string) : void {
		try {
			const cyphertext: Uint8Array	= Potassium.fromBase64(message);

			const id: number	= new Float64Array(cyphertext.buffer, 0, 1)[0];

			if (id >= this.incomingMessageId) {
				this.incomingMessagesMax	= Math.max(
					this.incomingMessagesMax,
					id
				);

				if (!this.incomingMessages[id]) {
					this.incomingMessages[id]	= [];
				}

				this.incomingMessages[id].push(cyphertext);
			}
		}
		catch (_) {}

		Util.lock(this.receiveLock, async () => {
			while (
				this.incomingMessageId <= this.incomingMessagesMax &&
				this.incomingMessages[this.incomingMessageId]
			) {
				let wasSuccessful: boolean;

				for (
					let cyphertext of
					this.incomingMessages[this.incomingMessageId]
				) {
					if (!wasSuccessful && (await this.core.receive(cyphertext))) {
						this.session.trigger(Events.cyphertext, {
							cyphertext: Potassium.toBase64(cyphertext),
							author: Users.friend
						});

						wasSuccessful	= true;
					}

					Potassium.clearMemory(cyphertext);
				}

				this.incomingMessages[this.incomingMessageId]	= null;

				if (!wasSuccessful) {
					break;
				}

				++this.incomingMessageId;
			}
		});
	}

	public async send (message: string) : Promise<void> {
		return this.sendHelper(message);
	}

	public constructor (private session: ISession, isNative: boolean = false) {
		this.core	= new CastleCore(
			this.session.state.isCreator,
			this.session.state.sharedSecret,
			{
				abort: async () =>
					this.session.trigger(Events.castle, {
						event: CastleEvents.abort
					})
				,
				connect: async () => {
					const sendQueue	= this.sendQueue;
					this.sendQueue	= null;

					for (let message of sendQueue) {
						await this.sendHelper(message, false);
					}

					this.session.trigger(Events.castle, {
						event: CastleEvents.connect
					});
				},
				receive: async (data: DataView) => {
					const id: number		= data.getFloat64(0, true);
					const timestamp: number	= data.getFloat64(8, true);
					const numBytes: number	= data.getFloat64(16, true);
					const numChunks: number	= data.getFloat64(24, true);
					const index: number		= data.getFloat64(32, true);
					const chunk: Uint8Array	= new Uint8Array(data.buffer, data.byteOffset + 40);

					if (!this.receivedMessages[id]) {
						this.receivedMessages[id]	= {
							data: new Uint8Array(numBytes),
							totalChunks: 0
						};
					}

					const message	= this.receivedMessages[id];

					message.data.set(chunk, index);
					Potassium.clearMemory(data);

					if (++message.totalChunks !== numChunks) {
						return;
					}

					if (timestamp >= this.lastIncomingMessageTimestamp) {
						this.lastIncomingMessageTimestamp	= timestamp;

						this.session.trigger(Events.castle, {
							event: CastleEvents.receive,
							data: {
								plaintext: Potassium.toString(message.data),
								timestamp
							}
						});
					}

					Potassium.clearMemory(message.data);
					this.receivedMessages[id]	= null;
				},
				send: async (cyphertext: string) => {
					this.session.trigger(Events.castle, {
						event: CastleEvents.send,
						data: cyphertext
					});

					this.session.trigger(Events.cyphertext, {
						cyphertext,
						author: Users.me
					});
				}
			},
			isNative
		);

		/* Wipe shared secret when finished with it */
		this.session.updateState(State.sharedSecret, '');
	}
}
