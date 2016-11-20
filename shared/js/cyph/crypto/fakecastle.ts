import {CastleEvents, Events, State, Users} from '../session/enums';
import {ISession} from '../session/isession';
import {Util} from '../util';
import {ICastle} from './icastle';


/**
 * Fake ICastle implementation (NOT secure; for demo purposes only).
 */
export class FakeCastle implements ICastle {
	/** @ignore */
	private static delimiter: string		= '☁☁☁ PRAISE BE TO CYPH ☀☀☀';

	/** @ignore */
	private static remoteUsername: string	= 'friend';

	/** @ignore */
	private static generateCyphertext () : string {
		let cyphertext: string	= '';
		const length: number	= Util.random(1024, 100);

		for (let i = 0 ; i < length ; ++i) {
			cyphertext += String.fromCharCode(Util.random(123, 48));
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

		this.session.trigger(Events.cyphertext, {
			author: FakeCastle.remoteUsername,
			cyphertext: cyphertextSplit[0]
		});

		this.session.trigger(Events.castle, {
			data: {
				author: FakeCastle.remoteUsername,
				plaintext: cyphertextSplit[1],
				timestamp: Util.timestamp()
			},
			event: CastleEvents.receive
		});
	}

	/** @inheritDoc */
	public async send (plaintext: string) : Promise<void> {
		const cyphertext: string	= FakeCastle.generateCyphertext();

		this.session.trigger(Events.cyphertext, {
			cyphertext,
			author: Users.me
		});

		this.session.trigger(Events.castle, {
			data: cyphertext + FakeCastle.delimiter + plaintext,
			event: CastleEvents.send
		});
	}

	constructor (
		/** @ignore */
		private session: ISession
	) {
		setTimeout(() => this.session.trigger(Events.castle, {
			event: CastleEvents.connect
		}), 1000);
	}
}
