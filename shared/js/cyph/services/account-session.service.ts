import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {User} from '../account/user';
import {BinaryProto, ISessionMessage, SessionMessage, StringProto} from '../proto';
import {ISessionMessageData, rpcEvents} from '../session';
import {uuid} from '../util/uuid';
import {resolvable} from '../util/wait';
import {AccountContactsService} from './account-contacts.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountService} from './account.service';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {EnvService} from './env.service';
import {ErrorService} from './error.service';
import {SessionInitService} from './session-init.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Account session service.
 */
@Injectable()
export class AccountSessionService extends SessionService {
	/** @ignore */
	private readonly _ACCOUNTS_SYMMETRIC_KEY	= resolvable<Uint8Array>();

	/** @ignore */
	private readonly _READY						= resolvable();

	/** @ignore */
	private initiated: boolean					= false;

	/** @ignore */
	private readonly resolveAccountsSymmetricKey: (symmetricKey: Uint8Array) => void	=
		this._ACCOUNTS_SYMMETRIC_KEY.resolve
	;

	/** @ignore */
	private readonly resolveReady: () => void	= this._READY.resolve;

	/** @ignore */
	private readonly stateResolver				= resolvable();

	/** @inheritDoc */
	protected readonly symmetricKey: Promise<Uint8Array>	=
		this._ACCOUNTS_SYMMETRIC_KEY.promise
	;

	/** If true, this is an ephemeral sub-session. */
	public ephemeralSubSession: boolean							= false;

	/** @inheritDoc */
	public readonly ready: Promise<void>						= this._READY.promise;

	/** Remote user. */
	public readonly remoteUser: BehaviorSubject<User|undefined>	=
		new BehaviorSubject<User|undefined>(undefined)
	;

	/** @inheritDoc */
	protected async channelOnClose () : Promise<void> {
		if (this.ephemeralSubSession) {
			await super.channelOnClose();
		}
	}

	/** @inheritDoc */
	protected async channelOnOpen (isAlice: boolean) : Promise<void> {
		await super.channelOnOpen(isAlice, false);
		this.stateResolver.resolve();
	}

	/** @inheritDoc */
	protected async getSessionMessageAuthor (
		message: ISessionMessageData
	) : Promise<Observable<string>|void> {
		if (!message.authorID) {
			return;
		}

		const user	= await this.accountUserLookupService.getUser(message.authorID);

		if (user) {
			return user.realUsername;
		}
	}

	/** @inheritDoc */
	protected async plaintextSendHandler (messages: ISessionMessage[]) : Promise<void> {
		await this.castleSendMessages(messages);
	}

	/** @inheritDoc */
	public close () : void {
		if (this.ephemeralSubSession) {
			super.close();
		}
	}

	/** Sets the remote user we're chatting with. */
	public async setUser (
		username: string,
		sessionSubID?: string,
		ephemeralSubSession: boolean = false
	) : Promise<void> {
		if (this.initiated) {
			throw new Error('User already set.');
		}

		this.initiated		= true;
		this.sessionSubID	= sessionSubID;

		(async () => {
			const contactID			= await this.accountContactsService.getContactID(username);

			if (ephemeralSubSession) {
				if (!this.sessionSubID) {
					throw new Error('Cannot start ephemeral sub-session without sessionSubID.');
				}

				this.ephemeralSubSession	= true;

				this.init(this.potassiumService.toHex(
					await this.potassiumService.hash.hash(
						`${contactID}-${this.sessionSubID}`
					)
				));

				return;
			}

			const sessionURL		= `contacts/${contactID}/session`;
			const symmetricKeyURL	= `${sessionURL}/symmetricKey`;

			this.incomingMessageQueue		= this.accountDatabaseService.getAsyncList(
				`${sessionURL}/incomingMessageQueue`,
				SessionMessage,
				undefined,
				undefined,
				undefined,
				false,
				true
			);

			this.incomingMessageQueueLock	= this.accountDatabaseService.lockFunction(
				`${sessionURL}/incomingMessageQueueLock${sessionSubID ? `/${sessionSubID}` : ''}`
			);

			this.init(contactID, await this.accountDatabaseService.getOrSetDefault(
				`${sessionURL}/channelUserID`,
				StringProto,
				uuid
			));


			const symmetricKeyPromise	= this.accountDatabaseService.getAsyncValue(
				symmetricKeyURL,
				BinaryProto,
				undefined,
				undefined,
				undefined,
				true
			).getValue();

			symmetricKeyPromise.then(symmetricKey => {
				this.resolveAccountsSymmetricKey(symmetricKey);
			});

			await this.stateResolver.promise;

			if (this.state.isAlice) {
				this.on(rpcEvents.requestSymmetricKey, async () => {
					this.send([rpcEvents.symmetricKey, {bytes: await symmetricKeyPromise}]);
				});
			}

			if ((await this.accountDatabaseService.hasItem(symmetricKeyURL))) {
				return;
			}

			if (this.state.isAlice) {
				const symmetricKey	= this.potassiumService.randomBytes(
					await this.potassiumService.secretBox.keyBytes
				);

				await Promise.all([
					this.accountDatabaseService.setItem(
						symmetricKeyURL,
						BinaryProto,
						symmetricKey
					),
					this.send([
						rpcEvents.symmetricKey,
						{bytes: symmetricKey}
					])
				]);
			}
			else {
				this.one<ISessionMessageData>(rpcEvents.symmetricKey).then(async ({bytes}) =>
					this.accountDatabaseService.setItem(
						symmetricKeyURL,
						BinaryProto,
						bytes || new Uint8Array(0)
					)
				);

				await this.send([rpcEvents.requestSymmetricKey, {}]);
			}
		})();

		const user	= await this.accountUserLookupService.getUser(username);

		if (user) {
			user.realUsername.subscribe(this.remoteUsername);
			await this.accountService.setHeader(user);
		}

		this.remoteUser.next(user);
		this.resolveReady();
	}

	/** @inheritDoc */
	public async yt () : Promise<void> {
		return new Promise<void>(resolve => {
			const id	= uuid();

			const f		= (o: ISessionMessageData) => {
				if (o.command && o.command.method === id) {
					this.off(rpcEvents.pong, f);
					resolve();
				}
			};

			this.on(rpcEvents.pong, f);
			this.send([rpcEvents.ping, {command: {method: id}}]);
		});
	}

	constructor (
		analyticsService: AnalyticsService,
		castleService: CastleService,
		channelService: ChannelService,
		envService: EnvService,
		errorService: ErrorService,
		potassiumService: PotassiumService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {
		super(
			analyticsService,
			castleService,
			channelService,
			envService,
			errorService,
			potassiumService,
			sessionInitService,
			stringsService
		);

		this.on(rpcEvents.ping, async (o: ISessionMessageData) => {
			if (o.command && o.command.method) {
				await this.freezePong.pipe(filter(b => !b), take(1)).toPromise();
				this.send([rpcEvents.pong, {command: {method: o.command.method}}]);
			}
		});
	}
}
