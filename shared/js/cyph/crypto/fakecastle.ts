import {ICastle} from 'icastle';
import {Util} from 'cyph/util';
import {CastleEvents, Events, State, Users} from 'session/enums';
import {ISession} from 'session/isession';


/**
 * Fake ICastle implementation (NOT secure; for demo purposes only).
 */
export class FakeCastle implements ICastle {
	private static delimiter: string		= '☁☁☁ PRAISE BE TO CYPH ☀☀☀';
	private static remoteUsername: string	= 'friend';

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


	public receive (cyphertext: string) : void {
		const cyphertextSplit: string[]	=
			cyphertext.split(FakeCastle.delimiter)
		;

		this.session.trigger(Events.cyphertext, {
			author: FakeCastle.remoteUsername,
			cyphertext: cyphertextSplit[0]
		});

		this.session.trigger(Events.castle, {
			event: CastleEvents.receive,
			data: {
				author: FakeCastle.remoteUsername,
				plaintext: cyphertextSplit[1],
				timestamp: Util.timestamp()
			}
		});
	}

	public async send (plaintext: string) : Promise<void> {
		const cyphertext: string	= FakeCastle.generateCyphertext();

		this.session.trigger(Events.cyphertext, {
			cyphertext,
			author: Users.me
		});

		this.session.trigger(Events.castle, {
			event: CastleEvents.send,
			data: cyphertext + FakeCastle.delimiter + plaintext
		});
	}

	/**
	 * @param session
	 */
	public constructor (private session: ISession) {
		setTimeout(() => this.session.trigger(Events.castle, {
			event: CastleEvents.connect
		}), 1000);
	}
}
