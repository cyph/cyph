import {ISession} from '../session/isession';
import {util} from '../util';
import {AnonymousLocalUser} from './castle/anonymous-local-user';
import {AnonymousRemoteUser} from './castle/anonymous-remote-user';
import {PairwiseSession} from './castle/pairwise-session';
import {Transport} from './castle/transport';
import {ICastle} from './icastle';
import {Potassium} from './potassium';


/**
 * Castle instance between two anonymous users.
 */
export class AnonymousCastle implements ICastle {
	/** @ignore */
	private readonly pairwiseSession: PairwiseSession;

	/** @inheritDoc */
	public receive (cyphertext: string) : void {
		this.pairwiseSession.receive(cyphertext);
	}

	/** @inheritDoc */
	public async send (
		plaintext: string,
		timestamp: number = util.timestamp()
	) : Promise<void> {
		return this.pairwiseSession.send(plaintext, timestamp);
	}

	constructor (session: ISession, isNative: boolean, remoteUsername: string) {
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
			session.state.sharedSecret,
			remoteUsername
		);

		this.pairwiseSession	= new PairwiseSession(
			potassium,
			transport,
			localUser,
			remoteUser,
			session.state.isAlice
		);
	}
}
