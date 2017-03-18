import {Injectable} from '@angular/core';
import {AnonymousLocalUser} from '../../crypto/castle/anonymous-local-user';
import {AnonymousRemoteUser} from '../../crypto/castle/anonymous-remote-user';
import {PairwiseSession} from '../../crypto/castle/pairwise-session';
import {Transport} from '../../crypto/castle/transport';
import {ICastle} from '../../crypto/icastle';
import {util} from '../../util';
import {SessionService} from '../session.service';
import {PotassiumService} from './potassium.service';


/**
 * Castle instance between two anonymous users.
 */
@Injectable()
export class AnonymousCastleService implements ICastle {
	/** @ignore */
	private readonly pairwiseSession: Promise<PairwiseSession>	=
		/* tslint:disable-next-line:promise-must-complete */
		new Promise<PairwiseSession>(resolve => {
			this.resolvePairwiseSession	= resolve;
		})
	;

	/** @ignore */
	private resolvePairwiseSession: (pairwiseSession: PairwiseSession) => void;

	/** Initializes service. */
	public init (sessionService: SessionService) : void {
		const transport			= new Transport(sessionService);

		const localUser			= new AnonymousLocalUser(
			this.potassiumService,
			transport,
			sessionService.state.sharedSecret
		);

		const remoteUser		= new AnonymousRemoteUser(
			this.potassiumService,
			transport,
			sessionService.state.sharedSecret,
			sessionService.remoteUsername
		);

		this.resolvePairwiseSession(new PairwiseSession(
			this.potassiumService,
			transport,
			localUser,
			remoteUser,
			sessionService.state.isAlice
		));
	}

	/** @inheritDoc */
	public async receive (cyphertext: string) : Promise<void> {
		return (await this.pairwiseSession).receive(cyphertext);
	}

	/** @inheritDoc */
	public async send (
		plaintext: string,
		timestamp: number = util.timestamp()
	) : Promise<void> {
		return (await this.pairwiseSession).send(plaintext, timestamp);
	}

	constructor (
		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
