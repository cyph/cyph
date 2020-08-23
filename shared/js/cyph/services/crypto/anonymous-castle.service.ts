import {Injectable} from '@angular/core';
import {
	AnonymousLocalUser,
	AnonymousRemoteUser,
	PairwiseSessionLite,
	RegisteredRemoteUser,
	Transport
} from '../../crypto/castle';
import {SessionService} from '../session.service';
import {AccountDatabaseService} from './account-database.service';
import {CastleService} from './castle.service';
import {PotassiumService} from './potassium.service';

/**
 * Castle instance for an anonymous user.
 */
@Injectable()
export class AnonymousCastleService extends CastleService {
	/** @inheritDoc */
	public async init (sessionService: SessionService) : Promise<void> {
		const transport = new Transport(sessionService);

		const handshakeState = await sessionService.handshakeState(
			undefined,
			undefined,
			sessionService.state.sharedSecret.value ? undefined : true
		);

		const localUser = new AnonymousLocalUser(
			this.potassiumService,
			handshakeState,
			sessionService.state.sharedSecret.value
		);

		const remoteUser = sessionService.state.sharedSecret.value ?
			new AnonymousRemoteUser(
				this.potassiumService,
				handshakeState,
				sessionService.state.sharedSecret.value,
				sessionService.remoteUsername
			) :
			new RegisteredRemoteUser(
				this.accountDatabaseService,
				false,
				sessionService.remoteUsername
			);

		this.pairwiseSession.resolve(
			new PairwiseSessionLite(
				undefined,
				undefined,
				this.potassiumService,
				transport,
				localUser,
				remoteUser,
				handshakeState
			)
		);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
