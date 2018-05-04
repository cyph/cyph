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

	/** @see ISessionService.closed */
	public get closed () : Promise<void> {
		return this.sessionService.closed;
	}

	/** Triggers connection event. */
	public connect () : void {
		this.sessionService.castleHandler(CastleEvents.connect);
	}

	/** Indicates whether or not this transport is still usable. */
	public get isAlive () : boolean {
		return this.sessionService.state.isAlive;
	}

	/** Trigger event for logging cyphertext. */
	public logCyphertext (author: Observable<string>, cyphertext: Uint8Array) : void {
		if (cyphertext.length >= Transport.cyphertextLimit) {
			return;
		}

		this.sessionService.trigger(events.cyphertext, {author, cyphertext});
	}

	/** Handle decrypted incoming message. */
	public async receive (
		cyphertext: Uint8Array,
		plaintext: Uint8Array,
		author: Observable<string>
	) : Promise<void> {
		this.logCyphertext(author, cyphertext);

		const timestamp	= potassiumUtil.toDataView(plaintext).getFloat64(0, true);
		const data		= potassiumUtil.toBytes(plaintext, 8);

		if (data.length > 0) {
			await this.sessionService.castleHandler(
				CastleEvents.receive,
				{author, plaintext: data, timestamp}
			);
		}
	}

	/** Send outgoing encrypted message. */
	public async send (cyphertext: Uint8Array) : Promise<void> {
		await this.sessionService.castleHandler(CastleEvents.send, cyphertext);
		this.logCyphertext(this.sessionService.localUsername, cyphertext);
	}

	constructor (
		/** @ignore */
		private readonly sessionService: ISessionService
	) {}
}
