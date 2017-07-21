import {Injectable} from '@angular/core';
import {
	PairwiseSession,
	RegisteredLocalUser,
	RegisteredRemoteUser,
	Transport
} from '../../crypto/castle';
import {ICastle} from '../../crypto/icastle';
import {LockFunction} from '../../lock-function-type';
import {CastleIncomingMessagesProto, MaybeBinaryProto, Uint32Proto} from '../../protos';
import {util} from '../../util';
import {AccountContactsService} from '../account-contacts.service';
import {SessionService} from '../session.service';
import {AccountDatabaseService} from './account-database.service';
import {PotassiumService} from './potassium.service';


/**
 * Castle instance between two registered users.
 */
@Injectable()
export class AccountCastleService implements ICastle {
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
		username: string,
		potassiumService: PotassiumService,
		sessionService: SessionService
	) : Promise<void> {
		const transport			= new Transport(sessionService);
		const handshakeState	= await sessionService.handshakeState();
		const localUser			= new RegisteredLocalUser(this.accountDatabaseService);
		const remoteUser		= new RegisteredRemoteUser(this.accountDatabaseService, username);

		const sessionURL	=
			`contacts/${await this.accountContactsService.getContactID(username)}/session`
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

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {}
}
