import {CastleEvents, events, users} from '../session/enums';
import {ISession} from '../session/isession';
import {strings} from '../strings';
import {util} from '../util';
import {ICastle} from './icastle';


/**
 * Fake ICastle implementation (NOT secure; for demo purposes only).
 */
export class FakeCastle implements ICastle {
	/** @ignore */
	private static readonly delimiter: string		= '☁☁☁ PRAISE BE TO CYPH ☀☀☀';

	/** @ignore */
	private static readonly remoteUsername: string	= strings.friend;

	/** @ignore */
	private static generateCyphertext () : string {
		let cyphertext			= '';
		const length: number	= util.random(1024, 100);

		for (let i = 0 ; i < length ; ++i) {
			cyphertext += String.fromCharCode(util.random(123, 48));
		}

		try {
			return btoa(cyphertext);
		}
		catch (_) {
			return cyphertext;
		}
	}


	/** @inheritDoc */
	public receive (cyphertext: string) : void {
		const cyphertextSplit: string[]	=
			cyphertext.split(FakeCastle.delimiter)
		;

		this.session.trigger(events.cyphertext, {
			author: FakeCastle.remoteUsername,
			cyphertext: cyphertextSplit[0]
		});

		this.session.trigger(events.castle, {
			data: {
				author: FakeCastle.remoteUsername,
				plaintext: cyphertextSplit[1],
				timestamp: util.timestamp()
			},
			event: CastleEvents.receive
		});
	}

	/** @inheritDoc */
	public async send (plaintext: string) : Promise<void> {
		const cyphertext: string	= FakeCastle.generateCyphertext();

		this.session.trigger(events.cyphertext, {
			cyphertext,
			author: users.me
		});

		this.session.trigger(events.castle, {
			data: cyphertext + FakeCastle.delimiter + plaintext,
			event: CastleEvents.send
		});
	}

	constructor (
		/** @ignore */
		private readonly session: ISession
	) {
		setTimeout(
			() => this.session.trigger(events.castle, {event: CastleEvents.connect}),
			1000
		);
	}
}
