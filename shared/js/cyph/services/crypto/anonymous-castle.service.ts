import {Injectable} from '@angular/core';
import {AnonymousLocalUser} from '../../crypto/castle/anonymous-local-user';
import {AnonymousRemoteUser} from '../../crypto/castle/anonymous-remote-user';
import {PairwiseSession} from '../../crypto/castle/pairwise-session';
import {Transport} from '../../crypto/castle/transport';
import {ICastle} from '../../crypto/icastle';
import {LockFunction} from '../../lock-function-type';
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
		new Promise<PairwiseSession>(resolve => {
			this.resolvePairwiseSession	= resolve;
		})
	;

	/** @ignore */
	private readonly pairwiseSessionLock: LockFunction			= util.lockFunction();

	/** @ignore */
	private resolvePairwiseSession: (pairwiseSession: PairwiseSession) => void;

	/** @ignore */
	private async getPairwiseSession () : Promise<PairwiseSession> {
		return this.pairwiseSessionLock(async () => this.pairwiseSession);
	}

	/** Initializes service. */
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

		this.resolvePairwiseSession(new PairwiseSession(
			potassiumService,
			transport,
			localUser,
			remoteUser,
			handshakeState
		));

		sessionService.state.sharedSecret	= '';
	}

	/** @inheritDoc */
	public async receive (cyphertext: Uint8Array) : Promise<void> {
		return (await this.getPairwiseSession()).receive(cyphertext);
	}

	/** @inheritDoc */
	public async send (plaintext: string|ArrayBufferView, timestamp?: number) : Promise<void> {
		if (timestamp === undefined) {
			timestamp	= await util.timestamp();
		}

		return (await this.getPairwiseSession()).send(plaintext, timestamp);
	}

	constructor () {}
}
