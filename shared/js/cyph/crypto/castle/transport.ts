import {CastleEvents, Events, Users} from '../../session/enums';
import {ISession} from '../../session/isession';
import {Potassium} from '../potassium';


/**
 * Handles transport layer logic.
 * Note that each PairwiseSession must have a unique Transport instance.
 */
export class Transport {
	/** @ignore */
	private static cyphertextLimit: number	= 200000;

	/** @ignore */
	public static chunkLength: number		= 5000000;


	/** @ignore */
	private lastIncomingMessageTimestamp: number	= 0;

	/** @ignore */
	private receivedMessages: {
		[id: number]: {data: Uint8Array; totalChunks: number}
	}	= {};

	/** Queue of cyphertext interception handlers. */
	public cyphertextIntercepters: Function[]	= [];

	/** Trigger abortion event. */
	public abort () : void {
		this.session.trigger(Events.castle, {event: CastleEvents.abort});
	}

	/** Trigger connection event. */
	public connect () : void {
		this.session.trigger(Events.castle, {event: CastleEvents.connect});
	}

	/**
	 * Intercept raw data of next incoming message before
	 * it ever hits the core Castle protocol logic.
	 */
	public interceptIncomingCyphertext (
		timeout: number = 45000
	) : Promise<Uint8Array> {
		return new Promise((resolve, reject) => {
			this.cyphertextIntercepters.push(resolve);

			if (timeout) {
				setTimeout(
					() => reject('Cyphertext interception timeout.'),
					timeout
				);
			}
		});
	}

	/**
	 * Trigger event for logging cyphertext.
	 * @param cyphertext
	 * @param author
	 */
	public logCyphertext (cyphertext: string, author: string) : void {
		if (cyphertext.length >= Transport.cyphertextLimit) {
			return;
		}

		this.session.trigger(Events.cyphertext, {author, cyphertext});
	}

	/**
	 * Handle decrypted incoming message.
	 * @param cyphertext
	 * @param messageId
	 */
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

			const messageData	= Potassium.toString(message.data);

			if (messageData) {
				this.session.trigger(Events.castle, {
					data: {author, timestamp, plaintext: messageData},
					event: CastleEvents.receive
				});
			}
		}

		Potassium.clearMemory(message.data);
		this.receivedMessages[id]	= null;
	}

	/**
	 * Send outgoing encrypted message.
	 * @param cyphertext
	 * @param messageId
	 */
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
			data: fullCyphertext,
			event: CastleEvents.send
		});

		this.logCyphertext(fullCyphertext, Users.me);
	}

	constructor (
		/** @ignore */
		private session: ISession
	) {}
}
