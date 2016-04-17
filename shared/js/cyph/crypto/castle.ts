import {CastleCore} from 'castlecore';
import {ICastle} from 'icastle';
import {CastleEvents, Events, State, Users} from 'session/enums';
import {ISession} from 'session/isession';
import {Sodium} from 'global/base';


export class Castle implements ICastle {
	private static chunkLength: number	= 40000;


	private incomingMessageId: number	= 0;
	private incomingMessagesMax: number	= 0;
	private sendQueue: string[]			= [];

	private incomingMessages: {
		[id: number] : Uint8Array[]
	}	= {};

	private receivedMessages: {
		[id: number] : { data: Uint8Array; totalChunks: number; }
	}	= {};

	private core: CastleCore;

	public receive (message: string) : void {
		try {
			const cyphertext: Uint8Array	= Sodium.from_base64(message);

			const id: number	= new Uint32Array(cyphertext.buffer, 0, 1)[0];

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

		while (
			this.incomingMessageId <= this.incomingMessagesMax &&
			this.incomingMessages[this.incomingMessageId]
		) {
			let wasSuccessful: boolean;

			for (
				const cyphertext of
				this.incomingMessages[this.incomingMessageId]
			) {
				if (!wasSuccessful && this.core.receive(cyphertext)) {
					this.session.trigger(Events.cyphertext, {
						cyphertext: Sodium.to_base64(cyphertext),
						author: Users.friend
					});

					wasSuccessful	= true;
				}

				Sodium.memzero(cyphertext);
			}

			this.incomingMessages[this.incomingMessageId]	= null;

			if (!wasSuccessful) {
				break;
			}

			++this.incomingMessageId;
		}
	}

	public send (message: string) : void {
		if (this.sendQueue) {
			this.sendQueue.push(message);
		}
		else {
			const messageBytes: Uint8Array	= Sodium.from_string(message);

			const numBytes: Uint8Array	= new Uint8Array(
				new Uint32Array([
					messageBytes.length
				]).buffer
			);

			const numChunks: Uint8Array	= new Uint8Array(
				new Uint32Array([
					Math.ceil(messageBytes.length / Castle.chunkLength)
				]).buffer
			);

			const id: Uint8Array	= new Uint8Array(4);
			crypto.getRandomValues(id);

			for (
				const i = new Uint32Array(1) ;
				i[0] < messageBytes.length ;
				i[0] += Castle.chunkLength
			) {
				const chunk: Uint8Array	= new Uint8Array(
					messageBytes.buffer,
					i[0],
					Math.min(
						Castle.chunkLength,
						messageBytes.length - i[0]
					)
				);

				const data: Uint8Array	= new Uint8Array(chunk.length + 16);

				data.set(id);
				data.set(new Uint8Array(i.buffer), 4);
				data.set(numBytes, 8);
				data.set(numChunks, 12);
				data.set(chunk, 16);

				try {
					this.core.send(data);
				}
				finally {
					Sodium.memzero(data);
				}
			}

			Sodium.memzero(messageBytes);
		}
	}

	public constructor (private session: ISession) {
		this.core	= new CastleCore(
			this.session.state.isCreator,
			this.session.state.sharedSecret,
			{
				abort: () =>
					this.session.trigger(Events.castle, {
						event: CastleEvents.abort
					})
				,
				connect: () => {
					const sendQueue	= this.sendQueue;
					this.sendQueue	= null;

					for (const message of sendQueue) {
						this.send(message);
					}

					this.session.trigger(Events.castle, {
						event: CastleEvents.connect
					});
				},
				receive: (data: Uint8Array, startIndex: number) => {
					const view: DataView	= new DataView(data.buffer, startIndex);
					const id: number		= view.getUint32(0, true);
					const index: number		= view.getUint32(4, true);
					const numBytes: number	= view.getUint32(8, true);
					const numChunks: number	= view.getUint32(12, true);
					const chunk: Uint8Array	= new Uint8Array(data.buffer, startIndex + 16);

					if (!this.receivedMessages[id]) {
						this.receivedMessages[id]	= {
							data: new Uint8Array(numBytes),
							totalChunks: 0
						};
					}

					this.receivedMessages[id].data.set(chunk, index);

					Sodium.memzero(data);

					if (++this.receivedMessages[id].totalChunks === numChunks) {
						this.session.trigger(Events.castle, {
							event: CastleEvents.receive,
							data: Sodium.to_string(this.receivedMessages[id].data)
						});

						Sodium.memzero(this.receivedMessages[id].data);

						this.receivedMessages[id]	= null;
					}
				},
				send: (cyphertext: string) => {
					this.session.trigger(Events.castle, {
						event: CastleEvents.send,
						data: cyphertext
					});

					this.session.trigger(Events.cyphertext, {
						cyphertext,
						author: Users.me
					});
				}
			}
		);

		/* Wipe shared secret when finished with it */
		this.session.updateState(State.sharedSecret, '');
	}
}
