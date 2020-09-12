import {Injectable} from '@angular/core';
import {of} from 'rxjs';
import {
	AnonymousRemoteUser,
	HandshakeSteps,
	PairwiseSessionLite,
	RegisteredLocalUser,
	RegisteredRemoteUser,
	Transport
} from '../../crypto/castle';
import {MaybeBinaryProto, Uint32Proto} from '../../proto';
import {debugLog} from '../../util/log';
import {AccountContactsService} from '../account-contacts.service';
import {AccountSessionService} from '../account-session.service';
import {LocalStorageService} from '../local-storage.service';
import {AccountDatabaseService} from './account-database.service';
import {CastleService} from './castle.service';
import {PotassiumService} from './potassium.service';

/**
 * Castle instance for a registered user.
 */
@Injectable()
export class AccountCastleService extends CastleService {
	/** @ignore */
	private initiated: boolean = false;

	/** @inheritDoc */
	public async init (
		accountSessionService: AccountSessionService
	) : Promise<void> {
		if (this.initiated) {
			return this.pairwiseSession.then(() => {});
		}

		this.initiated = true;

		const user = await accountSessionService.remoteUser;

		debugLog(() => ({startingAccountCastleSession: {user}}));

		if (user === undefined) {
			return;
		}

		const transport = new Transport(accountSessionService);

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
				new PairwiseSessionLite(
					undefined,
					undefined,
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
			'realUsername' in user ? user.realUsername : of(user.username)
		);

		/*
		Not necessary to reset the handshake and use the more complex
		Castle logic just because the session is ephemeral.

		if (accountSessionService.ephemeralSubSession) {
			return new PairwiseSessionLite(
				undefined,
				undefined,
				this.potassiumService,
				transport,
				localUser,
				remoteUser,
				await accountSessionService.handshakeState()
			);
		}
		*/

		const handshakeState = await accountSessionService.handshakeState(
			this.accountDatabaseService.getAsyncValue<HandshakeSteps>(
				`${sessionURL}/handshakeState/currentStep`,
				Uint32Proto
			),
			this.accountDatabaseService.getAsyncValue(
				`${sessionURL}/handshakeState/initialSecret`,
				MaybeBinaryProto
			),
			(await localUser.getSigningKeyPair()) === undefined ||
				(await remoteUser.getPublicSigningKey()) === undefined ?
				this.accountDatabaseService.currentUser.value?.pseudoAccount :
				undefined
		);

		this.pairwiseSession.resolve(
			new PairwiseSessionLite(
				sessionURL,
				this.localStorageService,
				this.potassiumService,
				transport,
				localUser,
				remoteUser,
				handshakeState
				/*
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
				*/
			)
		);
	}

	/** @inheritDoc */
	public spawn () : AccountCastleService {
		return new AccountCastleService(
			this.accountContactsService,
			this.accountDatabaseService,
			this.localStorageService,
			this.potassiumService
		);
	}

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
