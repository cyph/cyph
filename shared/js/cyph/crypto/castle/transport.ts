import {CastleEvents, events, users} from '../../session/enums';
import {ISession} from '../../session/isession';
import {util} from '../../util';
import {potassiumUtil} from '../potassium/potassium-util';


/**
 * Handles transport layer logic.
 * Note that each PairwiseSession must have a unique Transport instance.
 */
export class Transport {
	/** @ignore */
	private static readonly cyphertextLimit: number	= 200000;


	/** Queue of cyphertext interception handlers. */
	public readonly cyphertextIntercepters: ((cyphertext: Uint8Array) => void)[]	= [];

	/** Triggers abortion event. */
	public abort () : void {
		this.session.trigger(events.castle, {event: CastleEvents.abort});
	}

	/** Triggers connection event. */
	public connect () : void {
		this.session.trigger(events.castle, {event: CastleEvents.connect});
	}

	/**
	 * Intercept raw data of next incoming message before
	 * it ever hits the core Castle protocol logic.
	 */
	public async interceptIncomingCyphertext (timeout: number = 120000) : Promise<Uint8Array> {
		return new Promise<Uint8Array>(async (resolve, reject) => {
			this.cyphertextIntercepters.push(resolve);

			if (timeout) {
				await util.sleep(timeout);

				const index	= this.cyphertextIntercepters.indexOf(resolve);
				if (index < 0) {
					return;
				}

				this.cyphertextIntercepters.splice(index, 1);
				reject('Cyphertext interception timeout.');
			}
		});
	}

	/** Trigger event for logging cyphertext. */
	public logCyphertext (cyphertext: string, author: string) : void {
		if (cyphertext.length >= Transport.cyphertextLimit) {
			return;
		}

		this.session.trigger(events.cyphertext, {author, cyphertext});
	}

	/** Handle decrypted incoming message. */
	public receive (cyphertext: Uint8Array, plaintext: Uint8Array, author: string) : void {
		this.logCyphertext(potassiumUtil.toBase64(cyphertext), author);

		const timestamp	= new DataView(plaintext.buffer).getFloat64(plaintext.byteOffset, true);
		const data		= new Uint8Array(plaintext.buffer, plaintext.byteOffset + 8);
		const text		= potassiumUtil.toString(data);

		if (text) {
			this.session.trigger(events.castle, {
				data: {author, text, timestamp},
				event: CastleEvents.receive
			});
		}

		potassiumUtil.clearMemory(data);
	}

	/** Send outgoing encrypted message. */
	public send (cyphertext: string|ArrayBufferView, messageId?: ArrayBufferView) : void {
		const fullCyphertext	= potassiumUtil.toBase64(
			!messageId ? cyphertext : potassiumUtil.concatMemory(
				true,
				messageId,
				potassiumUtil.fromBase64(cyphertext)
			)
		);

		if (!messageId && typeof cyphertext !== 'string') {
			potassiumUtil.clearMemory(cyphertext);
		}

		this.session.trigger(events.castle, {
			data: fullCyphertext,
			event: CastleEvents.send
		});

		this.logCyphertext(fullCyphertext, users.me);
	}

	constructor (
		/** @ignore */
		private readonly session: ISession
	) {}
}
