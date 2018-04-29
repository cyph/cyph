import {Injectable} from '@angular/core';
import {take} from 'rxjs/operators';
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

				this.pairwiseSession.next(await getOrSetDefaultAsync(
					this.pairwiseSessions,
					accountSessionService.ephemeralSubSession ? undefined : user.username,
					async () => {
						const sessionURL		= `contacts/${contactID}/session`;

						const localUser			= new RegisteredLocalUser(
							this.accountDatabaseService
						);

						const remoteUser		= new RegisteredRemoteUser(
							this.accountDatabaseService,
							user.realUsername
						);

						if (accountSessionService.ephemeralSubSession) {
							return new PairwiseSession(
								potassiumService,
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
							)
						);

						return new PairwiseSession(
							potassiumService,
							transport,
							localUser,
							remoteUser,
							handshakeState,
							this.accountDatabaseService.getAsyncValue(
								`${sessionURL}/incomingMessageID`,
								Uint32Proto,
								undefined,
								undefined,
								undefined,
								undefined,
								true
							),
							this.accountDatabaseService.getAsyncValue(
								`${sessionURL}/incomingMessages`,
								CastleIncomingMessagesProto,
								undefined,
								undefined,
								undefined,
								undefined,
								true
							),
							this.accountDatabaseService.getAsyncValue(
								`${sessionURL}/incomingMessagesMax`,
								Uint32Proto,
								undefined,
								undefined,
								undefined,
								undefined,
								true
							),
							this.accountDatabaseService.getAsyncValue(
								`${sessionURL}/outgoingMessageID`,
								Uint32Proto,
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
							this.accountDatabaseService.lockFunction(`${sessionURL}/receiveLock`),
							this.accountDatabaseService.lockFunction(`${sessionURL}/sendLock`),
							{
								privateKey: this.accountDatabaseService.getAsyncValue(
									`${sessionURL}/asymmetricRatchetState/privateKey`,
									MaybeBinaryProto,
									undefined,
									undefined,
									undefined,
									undefined,
									true
								),
								publicKey: this.accountDatabaseService.getAsyncValue(
									`${sessionURL}/asymmetricRatchetState/publicKey`,
									MaybeBinaryProto,
									undefined,
									undefined,
									undefined,
									undefined,
									true
								)
							},
							{
								current: {
									incoming: this.accountDatabaseService.getAsyncValue(
										`${sessionURL}/symmetricRatchetState/current/incoming`,
										MaybeBinaryProto,
										undefined,
										undefined,
										undefined,
										undefined,
										true
									),
									outgoing: this.accountDatabaseService.getAsyncValue(
										`${sessionURL}/symmetricRatchetState/current/outgoing`,
										MaybeBinaryProto,
										undefined,
										undefined,
										undefined,
										undefined,
										true
									)
								},
								next: {
									incoming: this.accountDatabaseService.getAsyncValue(
										`${sessionURL}/symmetricRatchetState/next/incoming`,
										MaybeBinaryProto,
										undefined,
										undefined,
										undefined,
										undefined,
										true
									),
									outgoing: this.accountDatabaseService.getAsyncValue(
										`${sessionURL}/symmetricRatchetState/next/outgoing`,
										MaybeBinaryProto,
										undefined,
										undefined,
										undefined,
										undefined,
										true
									)
								}
							}
						);
					}
				));
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
