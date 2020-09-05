import {Injectable} from '@angular/core';
import {take} from 'rxjs/operators';
import {
	AnonymousLocalUser,
	AnonymousRemoteUser,
	HandshakeSteps,
	IHandshakeState,
	PairwiseSessionLite,
	RegisteredRemoteUser,
	Transport
} from '../../crypto/castle';
import {LocalAsyncValue} from '../../local-async-value';
import {MaybePromise} from '../../maybe-promise-type';
import {filterUndefinedOperator} from '../../util/filter';
import {SessionService} from '../session.service';
import {AccountDatabaseService} from './account-database.service';
import {CastleService} from './castle.service';
import {PotassiumService} from './potassium.service';

/**
 * Simplest possible CastleService implementation.
 */
@Injectable()
export class BasicCastleService extends CastleService {
	/** @ignore */
	private readonly handshakeState: IHandshakeState = {
		currentStep: new LocalAsyncValue(HandshakeSteps.Start),
		initialSecret: new LocalAsyncValue(undefined),
		initialSecretCyphertext: new LocalAsyncValue(new Uint8Array(0)),
		isAlice: false,
		localPublicKey: new LocalAsyncValue(new Uint8Array(0)),
		remotePublicKey: new LocalAsyncValue(new Uint8Array(0))
	};

	/** @inheritDoc */
	public async init (sessionService: SessionService) : Promise<void> {
		this.handshakeState.isAlice = sessionService.state.isAlice.value;

		const transport = new Transport(sessionService);

		const localUser = new AnonymousLocalUser(
			this.potassiumService,
			this.handshakeState,
			sessionService.state.sharedSecret.value
		);

		const remoteUser = sessionService.state.sharedSecret.value ?
			new AnonymousRemoteUser(
				this.potassiumService,
				this.handshakeState,
				sessionService.state.sharedSecret.value,
				sessionService.remoteUsername
			) :
			new RegisteredRemoteUser(
				this.accountDatabaseService,
				false,
				sessionService.remoteUsername
			);

		await this.handshakeState.initialSecret
			.watch()
			.pipe(filterUndefinedOperator(), take(1))
			.toPromise();

		this.pairwiseSession.resolve(
			new PairwiseSessionLite(
				undefined,
				undefined,
				this.potassiumService,
				transport,
				localUser,
				remoteUser,
				this.handshakeState
			)
		);
	}

	/** Sets session key. */
	public async setKey (key: MaybePromise<Uint8Array>) : Promise<void> {
		await this.handshakeState.currentStep.setValue(HandshakeSteps.Complete);
		await this.handshakeState.initialSecret.setValue(await key);
	}

	/** @inheritDoc */
	public spawn () : BasicCastleService {
		return new BasicCastleService(
			this.accountDatabaseService,
			this.potassiumService
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
