import {Injectable} from '@angular/core';
import {of} from 'rxjs';
import {switchMap, take} from 'rxjs/operators';
import {
	AnonymousRemoteUser,
	HandshakeSteps,
	IPairwiseSession,
	PairwiseSession,
	PairwiseSessionLite,
	RegisteredLocalUser,
	RegisteredRemoteUser,
	Transport
} from '../../crypto/castle';
import {
	BinaryProto,
	CastleIncomingMessagesProto,
	CastleRatchetState,
	CastleRatchetUpdate,
	MaybeBinaryProto,
	Uint32Proto
} from '../../proto';
import {filterUndefinedOperator} from '../../util/filter';
import {getOrSetDefaultAsync} from '../../util/get-or-set-default';
import {debugLog} from '../../util/log';
import {AccountContactsService} from '../account-contacts.service';
import {AccountSessionService} from '../account-session.service';
import {AccountDatabaseService} from './account-database.service';
import {CastleService} from './castle.service';
import {PotassiumService} from './potassium.service';

/**
 * Castle instance for a registered user.
 */
@Injectable()
export class AccountCastleService extends CastleService {
	/** @ignore */
	private readonly pairwiseSessions: Map<string, IPairwiseSession> = new Map<
		string,
		IPairwiseSession
	>();

	/** @inheritDoc */
	public async init (
		accountSessionService: AccountSessionService
	) : Promise<void> {
		const transport = new Transport(accountSessionService);

		const user = await accountSessionService.remoteUser
			.pipe(
				switchMap(async o => o),
				filterUndefinedOperator(),
				take(1)
			)
			.toPromise();

		debugLog(() => ({startingAccountCastleSession: {user}}));

		const localUser = new RegisteredLocalUser(this.accountDatabaseService);

		if (user.anonymous) {
			const anonymousHandshakeState = await accountSessionService.handshakeState(
				undefined,
				undefined,
				false
			);

			const anonymousRemoteUser = new AnonymousRemoteUser(
				this.potassiumService,
				anonymousHandshakeState,
				undefined,
				accountSessionService.remoteUsername
			);

			this.pairwiseSession.resolve(
				new PairwiseSession(
					this.potassiumService,
					transport,
					localUser,
					anonymousRemoteUser,
					anonymousHandshakeState
				)
			);

			return;
		}

		const castleSessionID = await this.accountContactsService
			.getCastleSessionData(user.username)
			.then(o => o.castleSessionID)
			.catch(() => undefined);

		if (!castleSessionID) {
			debugLog(() => ({
				startingAccountCastleSessionFailed: {user}
			}));
			return;
		}

		this.pairwiseSession.resolve(
			await getOrSetDefaultAsync(
				this.pairwiseSessions,
				accountSessionService.ephemeralSubSession ?
					undefined :
					user.username,
				async () => {
					debugLog(() => ({
						startingAccountCastleSessionNow: {
							castleSessionID,
							user
						}
					}));

					const sessionURL = `castleSessions/${castleSessionID}/session`;

					const remoteUser = new RegisteredRemoteUser(
						this.accountDatabaseService,
						user.pseudoAccount,
						'realUsername' in user ?
							user.realUsername :
							of(user.username)
					);

					if (accountSessionService.ephemeralSubSession) {
						return new PairwiseSession(
							this.potassiumService,
							transport,
							localUser,
							remoteUser,
							await accountSessionService.handshakeState()
						);
					}

					const handshakeState = await accountSessionService.handshakeState(
						this.accountDatabaseService.getAsyncValue<
							HandshakeSteps
						>(
							`${sessionURL}/handshakeState/currentStep`,
							Uint32Proto
						),
						this.accountDatabaseService.getAsyncValue(
							`${sessionURL}/handshakeState/initialSecret`,
							MaybeBinaryProto
						),
						(await localUser.getSigningKeyPair()) === undefined ||
							(await remoteUser.getPublicSigningKey()) ===
								undefined ?
							this.accountDatabaseService.currentUser.value
								?.pseudoAccount :
							undefined
					);

					return new PairwiseSessionLite(
						this.potassiumService,
						transport,
						localUser,
						remoteUser,
						handshakeState,
						this.accountDatabaseService.getAsyncValue(
							`${sessionURL}/incomingMessages`,
							CastleIncomingMessagesProto
						),
						this.accountDatabaseService.getAsyncList(
							`${sessionURL}/outgoingMessageQueue`,
							BinaryProto,
							undefined,
							undefined,
							undefined,
							false
						),
						this.accountDatabaseService.lockFunction(
							`${sessionURL}/lock`
						),
						this.accountDatabaseService.getAsyncValue(
							`${sessionURL}/ratchetState`,
							CastleRatchetState
						),
						this.accountDatabaseService.getAsyncList(
							`${sessionURL}/ratchetUpdateQueue`,
							CastleRatchetUpdate,
							undefined,
							undefined,
							undefined,
							false
						)
					);
				}
			)
		);
	}

	/** @inheritDoc */
	public spawn () : AccountCastleService {
		return new AccountCastleService(
			this.accountContactsService,
			this.accountDatabaseService,
			this.potassiumService
		);
	}

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
