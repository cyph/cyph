import {Injectable} from '@angular/core';
import {
	PairwiseSession,
	RegisteredLocalUser,
	RegisteredRemoteUser,
	Transport
} from '../../crypto/castle';
import {CastleIncomingMessagesProto, MaybeBinaryProto, Uint32Proto} from '../../protos';
import {AccountContactsService} from '../account-contacts.service';
import {SessionService} from '../session.service';
import {AccountDatabaseService} from './account-database.service';
import {CastleService} from './castle.service';
import {PotassiumService} from './potassium.service';


/**
 * Castle instance between two registered users.
 */
@Injectable()
export class AccountCastleService extends CastleService {
	/** @inheritDoc */
	public async init (
		potassiumService: PotassiumService,
		sessionService: SessionService
	) : Promise<void> {
		const transport			= new Transport(sessionService);

		const handshakeState	= await sessionService.handshakeState();

		const localUser			= new RegisteredLocalUser(this.accountDatabaseService);

		const remoteUser		= new RegisteredRemoteUser(
			this.accountDatabaseService,
			sessionService.remoteUsername
		);

		const sessionURL		=
			`contacts/${
				await this.accountContactsService.getContactID(
					await sessionService.remoteUsername.take(1).toPromise()
				)
			}/session`
		;

		this.resolvePairwiseSession(new PairwiseSession(
			potassiumService,
			transport,
			localUser,
			remoteUser,
			handshakeState,
			this.accountDatabaseService.getAsyncValue(
				`${sessionURL}/incomingMessageID`,
				Uint32Proto
			),
			this.accountDatabaseService.getAsyncValue(
				`${sessionURL}/incomingMessages`,
				CastleIncomingMessagesProto
			),
			this.accountDatabaseService.getAsyncValue(
				`${sessionURL}/incomingMessagesMax`,
				Uint32Proto
			),
			this.accountDatabaseService.getAsyncValue(
				`${sessionURL}/outgoingMessageID`,
				Uint32Proto
			),
			this.accountDatabaseService.lockFunction(`${sessionURL}/receiveLock`),
			this.accountDatabaseService.lockFunction(`${sessionURL}/sendLock`),
			this.accountDatabaseService.lockFunction(`${sessionURL}/coreLock`),
			{
				privateKey: this.accountDatabaseService.getAsyncValue(
					`${sessionURL}/asymmetricRatchetState/privateKey`,
					MaybeBinaryProto
				),
				publicKey: this.accountDatabaseService.getAsyncValue(
					`${sessionURL}/asymmetricRatchetState/publicKey`,
					MaybeBinaryProto
				)
			},
			{
				current: {
					incoming: this.accountDatabaseService.getAsyncValue(
						`${sessionURL}/symmetricRatchetState/current/incoming`,
						MaybeBinaryProto
					),
					outgoing: this.accountDatabaseService.getAsyncValue(
						`${sessionURL}/symmetricRatchetState/current/outgoing`,
						MaybeBinaryProto
					)
				},
				next: {
					incoming: this.accountDatabaseService.getAsyncValue(
						`${sessionURL}/symmetricRatchetState/next/incoming`,
						MaybeBinaryProto
					),
					outgoing: this.accountDatabaseService.getAsyncValue(
						`${sessionURL}/symmetricRatchetState/next/outgoing`,
						MaybeBinaryProto
					)
				}
			}
		));
	}

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {
		super();
	}
}
