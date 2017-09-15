import {Injectable} from '@angular/core';
import {StringProto} from '../protos';
import {ISessionService} from '../service-interfaces/isession.service';
import {IChannelHandlers} from '../session';
import {util} from '../util';
import {AccountContactsService} from './account-contacts.service';
import {ChannelService} from './channel.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';


/**
 * ChannelService for accounts.
 */
@Injectable()
export class AccountChannelService extends ChannelService {
	/** @inheritDoc */
	public async close () : Promise<void> {}

	/** @inheritDoc */
	public async init (
		sessionService: ISessionService,
		_CHANNEL_ID: string|undefined,
		_USER_ID: string|undefined,
		handlers: IChannelHandlers
	) : Promise<void> {
		const username	= util.normalize(await sessionService.remoteUsername.take(2).toPromise());
		const contactID	= await this.accountContactsService.getContactID(username);

		super.init(
			sessionService,
			contactID,
			await this.accountDatabaseService.getOrSetDefault(
				`contacts/${contactID}/session/channelUserID`,
				StringProto,
				() => util.uuid()
			),
			handlers
		);
	}

	constructor (
		databaseService: DatabaseService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {
		super(databaseService);
	}
}
