import {Injectable} from '@angular/core';
import {of} from 'rxjs';
import {take} from 'rxjs/operators';
import {
	AnonymousRemoteUser,
	HandshakeSteps,
	PairwiseSession,
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
	private readonly pairwiseSessions: Map<string, PairwiseSession>	=
		new Map<string, PairwiseSession>()
	;

	/** @inheritDoc */
	public async init (accountSessionService: AccountSessionService) : Promise<void> {
		const transport	= new Transport(accountSessionService);

		this.subscriptions.push(accountSessionService.remoteUser.pipe(
			filterUndefinedOperator(),
			take(1)
		).subscribe(async user => {
			debugLog(() => ({startingAccountCastleSession: {user}}));

			const localUser	= new RegisteredLocalUser(this.accountDatabaseService);

			if (user.anonymous) {
				const anonymousHandshakeState	= await accountSessionService.handshakeState();

				const anonymousRemoteUser		= new AnonymousRemoteUser(
					this.potassiumService,
					anonymousHandshakeState,
					undefined,
					accountSessionService.remoteUsername
				);

				this.pairwiseSession.next(new PairwiseSession(
					this.potassiumService,
					transport,
					localUser,
					anonymousRemoteUser,
					anonymousHandshakeState
				));

				return;
			}

			const castleSessionID	= await this.accountContactsService.
				getCastleSessionID(user.username).
				catch(() => undefined)
			;

			if (!castleSessionID) {
				debugLog(() => ({startingAccountCastleSessionFailed: {user}}));
				return;
			}

			this.pairwiseSession.next(await getOrSetDefaultAsync(
				this.pairwiseSessions,
				accountSessionService.ephemeralSubSession ? undefined : user.username,
				async () => {
					debugLog(() => ({startingAccountCastleSessionNow: {
						castleSessionID,
						user
					}}));

					const sessionURL		= `castleSessions/${castleSessionID}/session`;

					const remoteUser		= new RegisteredRemoteUser(
						this.accountDatabaseService,
						user.pseudoAccount,
						'realUsername' in user ? user.realUsername : of(user.username)
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

					const handshakeState	= await accountSessionService.handshakeState(
						this.accountDatabaseService.getAsyncValue<HandshakeSteps>(
							`${sessionURL}/handshake/currentStep`,
							Uint32Proto,
							undefined,
							undefined,
							undefined,
							undefined,
							true
						),
						this.accountDatabaseService.getAsyncValue(
							`${sessionURL}/handshake/initialSecret`,
							MaybeBinaryProto,
							undefined,
							undefined,
							undefined,
							undefined,
							true
						),
						(
							(await localUser.getSigningKeyPair()) === undefined ||
							(await remoteUser.getPublicSigningKey()) === undefined
						) ?
							(
								this.accountDatabaseService.currentUser.value &&
								this.accountDatabaseService.currentUser.value.pseudoAccount
							) :
							undefined
					);

					return new PairwiseSession(
						this.potassiumService,
						transport,
						localUser,
						remoteUser,
						handshakeState,
						this.accountDatabaseService.getAsyncValue(
							`${sessionURL}/incomingMessages`,
							CastleIncomingMessagesProto,
							undefined,
							undefined,
							undefined,
							undefined,
							true
						),
						this.accountDatabaseService.getAsyncList(
							`${sessionURL}/outgoingMessageQueue`,
							BinaryProto,
							undefined,
							undefined,
							undefined,
							false,
							true
						),
						this.accountDatabaseService.lockFunction(`${sessionURL}/lock`),
						this.accountDatabaseService.getAsyncValue(
							`${sessionURL}/ratchetState`,
							CastleRatchetState,
							undefined,
							undefined,
							undefined,
							undefined,
							true
						),
						this.accountDatabaseService.getAsyncList(
							`${sessionURL}/ratchetUpdateQueue`,
							CastleRatchetUpdate,
							undefined,
							undefined,
							undefined,
							false,
							true
						),
						this.accountDatabaseService.getAsyncValue(
							`${sessionURL}/liteRatchetState`,
							BinaryProto,
							undefined,
							undefined,
							undefined,
							false,
							true
						)
					);
				}
			));
		}));
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
