import {Potassium} from 'crypto/potassium';
import {CastleEvents, Events, Users} from 'session/enums';
import {ISession} from 'session/isession';


/**
 * Handles transport layer logic.
 * Note that each PairwiseSession must have a unique Transport instance.
 */
export class Transport {
	private static cyphertextLimit: number	= 200000;

	public static chunkLength: number		= 5000000;


	private lastIncomingMessageTimestamp: number	= 0;

	private receivedMessages: {
		[id: number] : {data: Uint8Array; totalChunks: number;}
	}	= {};

	public cyphertextIntercepters: Function[]	= [];

	public abort () : void {
		this.session.trigger(Events.castle, {event: CastleEvents.abort});
	}

	public connect () : void {
		this.session.trigger(Events.castle, {event: CastleEvents.connect});
	}

	public interceptIncomingCyphertext (
		timeout: number = 45000
	) : Promise<Uint8Array> {
		return new Promise((resolve, reject) => {
			this.cyphertextIntercepters.push(resolve);

			if (timeout) {
				setTimeout(() =>
					reject('Cyphertext interception timeout.')
				, timeout);
			}
		});
	}

	public logCyphertext (cyphertext: string, author: string) : void {
		if (cyphertext.length >= Transport.cyphertextLimit) {
			return;
		}

		this.session.trigger(Events.cyphertext, {author, cyphertext});
	}

	public receive (
		cyphertext: Uint8Array,
		plaintext: DataView,
		author: string
	) : void {
		this.logCyphertext(Potassium.toBase64(cyphertext), author);

		const id: number		= plaintext.getFloat64(0, true);
		const timestamp: number	= plaintext.getFloat64(8, true);
		const numBytes: number	= plaintext.getFloat64(16, true);
		const numChunks: number	= plaintext.getFloat64(24, true);
		const index: number		= plaintext.getFloat64(32, true);

		const chunk: Uint8Array	= new Uint8Array(
			plaintext.buffer,
			plaintext.byteOffset + 40
		);

		if (!this.receivedMessages[id]) {
			this.receivedMessages[id]	= {
				data: new Uint8Array(numBytes),
				totalChunks: 0
			};
		}

		const message	= this.receivedMessages[id];

		message.data.set(chunk, index);
		Potassium.clearMemory(plaintext);

		if (++message.totalChunks !== numChunks) {
			return;
		}

		if (timestamp > this.lastIncomingMessageTimestamp) {
			this.lastIncomingMessageTimestamp	= timestamp;

			const plaintext	= Potassium.toString(message.data);

			if (plaintext) {
				this.session.trigger(Events.castle, {
					event: CastleEvents.receive,
					data: {author, plaintext, timestamp}
				});
			}
		}

		Potassium.clearMemory(message.data);
		this.receivedMessages[id]	= null;
	}

	public send (
		cyphertext: string|ArrayBufferView,
		messageId?: ArrayBufferView
	) : void {
		const fullCyphertext: string	= Potassium.toBase64(
			!messageId ? cyphertext : Potassium.concatMemory(
				true,
				messageId,
				Potassium.fromBase64(cyphertext)
			)
		);

		if (!messageId && typeof cyphertext !== 'string') {
			Potassium.clearMemory(cyphertext);
		}

		this.session.trigger(Events.castle, {
			event: CastleEvents.send,
			data: fullCyphertext
		});

		this.logCyphertext(fullCyphertext, Users.me);
	}

	/**
	 * @param session
	 */
	public constructor (private session: ISession) {}
}
