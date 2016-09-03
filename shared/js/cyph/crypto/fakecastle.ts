import {ICastle} from 'icastle';
import {Util} from 'cyph/util';
import * as Session from 'session/session';


/**
 * Fake ICastle implementation (NOT secure; for demo purposes only).
 */
export class FakeCastle implements ICastle {
	private static delimiter: string	= '☁☁☁ PRAISE BE TO CYPH ☀☀☀';

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


	public receive (message: string) : void {
		const messageSplit: string[]	= message.split(FakeCastle.delimiter);

		this.session.trigger(Session.Events.cyphertext, {
			cyphertext: messageSplit[0],
			author: Session.Users.friend
		});

		this.session.trigger(Session.Events.castle, {
			event: Session.CastleEvents.receive,
			data: {
				plaintext: messageSplit[1],
				timestamp: Util.timestamp()
			}
		});
	}

	public async send (message: string) : Promise<void> {
		const cyphertext: string	= FakeCastle.generateCyphertext();

		this.session.trigger(Session.Events.cyphertext, {
			cyphertext,
			author: Session.Users.me
		});

		this.session.trigger(Session.Events.castle, {
			event: Session.CastleEvents.send,
			data: cyphertext + FakeCastle.delimiter + message
		});
	}

	public constructor (private session: Session.ISession) {
		setTimeout(() => this.session.trigger(Session.Events.castle, {
			event: Session.CastleEvents.connect
		}), 1000);
	}
}
