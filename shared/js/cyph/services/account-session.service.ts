import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {User} from '../account/user';
import {BinaryProto, StringProto} from '../proto';
import {ISessionMessageData, rpcEvents} from '../session';
import {uuid} from '../util/uuid';
import {resolvable} from '../util/wait';
import {AccountContactsService} from './account-contacts.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {EnvService} from './env.service';
import {ErrorService} from './error.service';
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

	/** @inheritDoc */
	protected readonly symmetricKey: Promise<Uint8Array>	=
		this._ACCOUNTS_SYMMETRIC_KEY.promise
	;

	/** @inheritDoc */
	public readonly ready: Promise<void>						= this._READY.promise;

	/** Remote user. */
	public readonly remoteUser: BehaviorSubject<User|undefined>	=
		new BehaviorSubject<User|undefined>(undefined)
	;

	/** @inheritDoc */
	protected async channelOnClose () : Promise<void> {}

	/** Sets the remote user we're chatting with. */
	public async setUser (username: string) : Promise<void> {
		if (this.initiated) {
			throw new Error('User already set.');
		}

		this.initiated	= true;

		(async () => {
			const contactID	= await this.accountContactsService.getContactID(username);

			this.init(contactID, await this.accountDatabaseService.getOrSetDefault(
				`contacts/${contactID}/session/channelUserID`,
				StringProto,
				uuid
			));

			const symmetricKeyURL	= `contacts/${contactID}/session/symmetricKey`;

			this.accountDatabaseService.getAsyncValue(
				symmetricKeyURL,
				BinaryProto,
				undefined,
				undefined,
				undefined,
				true
			).getValue().then(symmetricKey => {
				this.resolveAccountsSymmetricKey(symmetricKey);
			});

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
				await this.accountDatabaseService.setItem(
					symmetricKeyURL,
					BinaryProto,
					(await this.one<ISessionMessageData>(rpcEvents.symmetricKey)).bytes ||
						new Uint8Array(0)
				);
			}
		})();

		const user	= await this.accountUserLookupService.getUser(username);

		if (user) {
			user.realUsername.subscribe(this.remoteUsername);
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
		stringsService: StringsService,

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
			stringsService
		);

		this.on(rpcEvents.ping, (o: ISessionMessageData) => {
			if (o.command && o.command.method) {
				this.send([rpcEvents.pong, {command: {method: o.command.method}}]);
			}
		});
	}
}
