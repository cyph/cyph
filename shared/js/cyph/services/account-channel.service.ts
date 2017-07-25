import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {IAsyncValue} from '../iasync-value';
import {IProto} from '../iproto';
import {LockFunction} from '../lock-function-type';
import {StringProto} from '../protos';
import {IChannelService} from '../service-interfaces/ichannel.service';
import {ISessionService} from '../service-interfaces/isession.service';
import {IChannelHandlers} from '../session';
import {util} from '../util';
import {AccountContactsService} from './account-contacts.service';
import {ChannelService} from './channel.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';


/**
 * Manages many channels and exposes the one corresponding to the current active remote user.
 */
@Injectable()
export class AccountChannelService implements IChannelService {
	/** @ignore */
	protected readonly channelService: BehaviorSubject<ChannelService|undefined>	=
		new BehaviorSubject<ChannelService|undefined>(undefined)
	;

	/** @ignore */
	protected readonly channelServiceFiltered: Observable<ChannelService>			=
		<any> this.channelService.filter(o => o !== undefined)
	;

	/** @ignore */
	protected readonly channelServiceLock: LockFunction				= util.lockFunction();

	/** @ignore */
	protected readonly channelServices: Map<string, ChannelService>	=
		new Map<string, ChannelService>()
	;

	/** @ignore */
	protected async getChannelService () : Promise<ChannelService> {
		await this.channelServiceFiltered.first().toPromise();
		return this.channelServiceLock(async () =>
			this.channelServiceFiltered.take(1).toPromise()
		);
	}

	/** @inheritDoc */
	public async close () : Promise<void> {}

	/** @inheritDoc */
	public async getAsyncValue<T> (
		url: string,
		proto: IProto<T>,
		blockGetValue?: boolean
	) : Promise<IAsyncValue<T>> {
		return (await this.getChannelService()).getAsyncValue(
			url,
			proto,
			blockGetValue
		);
	}

	/** @inheritDoc */
	public async init (
		sessionService: ISessionService,
		_CHANNEL_ID: string|undefined,
		_USER_ID: string|undefined,
		handlers: IChannelHandlers
	) : Promise<void> {
		let lastChannelService: ChannelService|undefined;

		sessionService.remoteUsername.subscribe(username => {
			username	= username.toLowerCase();

			this.channelServiceLock(async () => {
				const contactID	= await this.accountContactsService.getContactID(username).catch(
					() => undefined
				);

				if (!contactID) {
					return;
				}

				const next	= await util.getOrSetDefaultAsync(
					this.channelServices,
					username,
					async () => {
						const channelService	= new ChannelService(this.databaseService);

						channelService.init(
							sessionService,
							contactID,
							await this.accountDatabaseService.getOrSetDefault(
								`contacts/${contactID}/session/channelUserID`,
								StringProto,
								() => util.uuid()
							),
							handlers
						);

						return channelService;
					}
				);

				if (lastChannelService) {
					lastChannelService.pauseOnMessage(true);
				}

				lastChannelService	= next;

				next.pauseOnMessage(false);
				this.channelService.next(next);
			});
		});
	}

	/** @inheritDoc */
	public async lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T> {
		return (await this.getChannelService()).lock(f, reason);
	}

	/** @inheritDoc */
	public async send (cyphertext: Uint8Array) : Promise<void> {
		return (await this.getChannelService()).send(cyphertext);
	}

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly databaseService: DatabaseService
	) {}
}
