import {ICastle} from './icastle';
import {Potassium} from './potassium';
import {Util} from '../util';
import {State} from '../session/enums';
import {ISession} from '../session/isession';
import * as Castle from './castle/castle';


export class AnonymousCastle implements ICastle {
	private pairwiseSession: Castle.PairwiseSession;

	public receive (cyphertext: string) : void {
		return this.pairwiseSession.receive(cyphertext);
	}

	public send (
		plaintext: string,
		timestamp: number = Util.timestamp()
	) : Promise<void> {
		return this.pairwiseSession.send(plaintext, timestamp);
	}

	public constructor (session: ISession, isNative: boolean) {
		const potassium		= new Potassium(isNative);
		const transport		= new Castle.Transport(session);

		const localUser		= new Castle.AnonymousLocalUser(
			potassium,
			transport,
			session.state.sharedSecret
		);

		const remoteUser	= new Castle.AnonymousRemoteUser(
			potassium,
			transport,
			session.state.sharedSecret
		);

		session.updateState(State.sharedSecret, '');

		this.pairwiseSession	= new Castle.PairwiseSession(
			potassium,
			transport,
			localUser,
			remoteUser,
			session.state.isAlice
		);
	}
}
