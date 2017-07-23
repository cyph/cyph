import {Observable} from 'rxjs';
import {ISessionService} from '../../service-interfaces/isession.service';
import {CastleEvents, events} from '../../session/enums';
import {potassiumUtil} from '../potassium/potassium-util';


/**
 * Handles transport layer logic.
 * Note that each PairwiseSession must have a unique Transport instance.
 */
export class Transport {
	/** @ignore */
	private static readonly cyphertextLimit: number	= 200000;


	/** Triggers abortion event. */
	public abort () : void {
		this.sessionService.castleHandler(CastleEvents.abort);
	}

	/** Triggers connection event. */
	public connect () : void {
		this.sessionService.castleHandler(CastleEvents.connect);
	}

	/** Trigger event for logging cyphertext. */
	public logCyphertext (author: Observable<string>, cyphertext: Uint8Array) : void {
		if (cyphertext.length >= Transport.cyphertextLimit) {
			return;
		}

		this.sessionService.trigger(events.cyphertext, {author, cyphertext});
	}

	/** Handle decrypted incoming message. */
	public receive (
		cyphertext: Uint8Array,
		plaintext: Uint8Array,
		author: Observable<string>
	) : void {
		this.logCyphertext(author, cyphertext);

		const timestamp	= potassiumUtil.toDataView(plaintext).getFloat64(0, true);
		const data		= potassiumUtil.toBytes(plaintext, 8);

		if (data.length > 0) {
			this.sessionService.castleHandler(
				CastleEvents.receive,
				{author, plaintext: data, timestamp}
			);
		}
	}

	/** Send outgoing encrypted message. */
	public send (cyphertext: Uint8Array, messageID: Uint8Array) : void {
		const fullCyphertext	= potassiumUtil.concatMemory(
			true,
			messageID,
			potassiumUtil.fromBase64(cyphertext)
		);

		this.sessionService.castleHandler(CastleEvents.send, fullCyphertext);

		this.logCyphertext(
			this.sessionService.localUsername,
			fullCyphertext
		);
	}

	constructor (
		/** @ignore */
		private readonly sessionService: ISessionService
	) {}
}
