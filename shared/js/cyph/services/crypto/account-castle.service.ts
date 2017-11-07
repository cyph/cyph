import {Injectable} from '@angular/core';
import {
	HandshakeSteps,
	PairwiseSession,
	RegisteredLocalUser,
	RegisteredRemoteUser,
	Transport
} from '../../crypto/castle';
import {
	BinaryProto,
	CastleIncomingMessagesProto,
	MaybeBinaryProto,
	Uint32Proto
} from '../../protos';
import {getOrSetDefaultAsync, normalize} from '../../util';
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
	/** @ignore */
	private readonly pairwiseSessions: Map<string, PairwiseSession>	=
		new Map<string, PairwiseSession>()
	;

	/** @inheritDoc */
	public async init (
		potassiumService: PotassiumService,
		sessionService: SessionService
	) : Promise<void> {
		const transport	= new Transport(sessionService);

		sessionService.remoteUsername.subscribe(username => {
			username	= normalize(username);

			this.pairwiseSessionLock(async () => {
				const contactID	= await this.accountContactsService.getContactID(username).catch(
					() => undefined
				);

				if (!contactID) {
					return;
				}

				this.pairwiseSession.next(
					await getOrSetDefaultAsync(this.pairwiseSessions, username, async () => {
						const sessionURL		= `contacts/${contactID}/session`;

						const handshakeState	= await sessionService.handshakeState(
							this.accountDatabaseService.getAsyncValue<HandshakeSteps>(
								`${sessionURL}/handshake/currentStep`,
								Uint32Proto
							),
							this.accountDatabaseService.getAsyncValue(
								`${sessionURL}/handshake/initialSecret`,
								MaybeBinaryProto
							)
						);

						const localUser			= new RegisteredLocalUser(
							this.accountDatabaseService
						);

						const remoteUser		= new RegisteredRemoteUser(
							this.accountDatabaseService,
							sessionService.remoteUsername
						);

						return new PairwiseSession(
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
							this.accountDatabaseService.getAsyncList(
								`${sessionURL}/outgoingMessageQueue`,
								BinaryProto
							),
							this.accountDatabaseService.lockFunction(`${sessionURL}/receiveLock`),
							this.accountDatabaseService.lockFunction(`${sessionURL}/sendLock`),
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
						);
					})
				);
			});
		});
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
