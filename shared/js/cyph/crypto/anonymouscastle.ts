import {ICastle} from './icastle';
import {Potassium} from './potassium';
import {AnonymousLocalUser} from './castle/anonymouslocaluser';
import {AnonymousRemoteUser} from './castle/anonymousremoteuser';
import {PairwiseSession} from './castle/pairwisesession';
import {Transport} from './castle/transport';
import {Util} from '../util';
import {State} from '../session/enums';
import {ISession} from '../session/isession';


export class AnonymousCastle implements ICastle {
	private pairwiseSession: PairwiseSession;

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
		const transport		= new Transport(session);

		const localUser		= new AnonymousLocalUser(
			potassium,
			transport,
			session.state.sharedSecret
		);

		const remoteUser	= new AnonymousRemoteUser(
			potassium,
			transport,
			session.state.sharedSecret
		);

		session.updateState(State.sharedSecret, '');

		this.pairwiseSession	= new PairwiseSession(
			potassium,
			transport,
			localUser,
			remoteUser,
			session.state.isAlice
		);
	}
}
