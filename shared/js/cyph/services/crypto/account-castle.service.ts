import {Injectable} from '@angular/core';
import {take} from 'rxjs/operators/take';
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
} from '../../proto';
import {filterUndefinedOperator} from '../../util/filter';
import {getOrSetDefaultAsync} from '../../util/get-or-set-default';
import {AccountContactsService} from '../account-contacts.service';
import {AccountSessionService} from '../account-session.service';
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
		accountSessionService: AccountSessionService
	) : Promise<void> {
		const transport	= new Transport(accountSessionService);

		accountSessionService.remoteUser.pipe(
			filterUndefinedOperator(),
			take(1)
		).subscribe(user => {
			this.pairwiseSessionLock(async () => {
				const contactID	= await this.accountContactsService.
					getContactID(user.username).
					catch(() => undefined)
				;

				if (!contactID) {
					return;
				}

				this.pairwiseSession.next(
					await getOrSetDefaultAsync(this.pairwiseSessions, user.username, async () => {
						const sessionURL		= `contacts/${contactID}/session`;

						const handshakeState	= await accountSessionService.handshakeState(
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
							user.realUsername
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
