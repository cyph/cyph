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
	public readonly cyphertextInterceptors: ((cyphertext: Uint8Array) => void)[]	= [];

	/** Triggers abortion event. */
	public abort () : void {
		this.session.castleHandler(CastleEvents.abort);
	}

	/** Triggers connection event. */
	public connect () : void {
		this.session.castleHandler(CastleEvents.connect);
	}

	/**
	 * Intercept raw data of next incoming message before
	 * it ever hits the core Castle protocol logic.
	 */
	public async interceptIncomingCyphertext (timeout: number = 120000) : Promise<Uint8Array> {
		return new Promise<Uint8Array>(async (resolve, reject) => {
			this.cyphertextInterceptors.push(resolve);

			if (timeout) {
				await util.sleep(timeout);

				const index	= this.cyphertextInterceptors.indexOf(resolve);
				if (index < 0) {
					return;
				}

				this.cyphertextInterceptors.splice(index, 1);
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

		const timestamp	= potassiumUtil.toDataView(plaintext).getFloat64(0, true);
		const data		= potassiumUtil.toBytes(plaintext, 8);

		if (data.length > 0) {
			this.session.castleHandler(
				CastleEvents.receive,
				{author, plaintext: data, timestamp}
			);
		}
	}

	/** Send outgoing encrypted message. */
	public send (cyphertext: Uint8Array, messageId?: Uint8Array) : void {
		const fullCyphertext	= !messageId ?
			cyphertext :
			potassiumUtil.concatMemory(
				true,
				messageId,
				potassiumUtil.fromBase64(cyphertext)
			)
		;

		this.session.castleHandler(CastleEvents.send, fullCyphertext);
		this.logCyphertext(potassiumUtil.toBase64(fullCyphertext), users.me);
	}

	constructor (
		/** @ignore */
		private readonly session: ISession
	) {}
}
