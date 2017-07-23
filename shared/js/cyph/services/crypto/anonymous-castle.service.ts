import {Injectable} from '@angular/core';
import {
	AnonymousLocalUser,
	AnonymousRemoteUser,
	PairwiseSession,
	Transport
} from '../../crypto/castle';
import {SessionService} from '../session.service';
import {CastleService} from './castle.service';
import {PotassiumService} from './potassium.service';


/**
 * Castle instance between two anonymous users.
 */
@Injectable()
export class AnonymousCastleService extends CastleService {
	/** @inheritDoc */
	public async init (
		potassiumService: PotassiumService,
		sessionService: SessionService
	) : Promise<void> {
		await sessionService.connected;

		const transport			= new Transport(sessionService);

		const handshakeState	= await sessionService.handshakeState();

		const localUser			= new AnonymousLocalUser(
			potassiumService,
			handshakeState,
			sessionService.state.sharedSecret
		);

		const remoteUser		= new AnonymousRemoteUser(
			potassiumService,
			handshakeState,
			sessionService.state.sharedSecret,
			sessionService.remoteUsername
		);

		this.pairwiseSession.next(new PairwiseSession(
			potassiumService,
			transport,
			localUser,
			remoteUser,
			handshakeState
		));

		sessionService.state.sharedSecret	= '';
	}

	constructor () {
		super();
	}
}
