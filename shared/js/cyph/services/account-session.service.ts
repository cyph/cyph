import {Injectable} from '@angular/core';
import {BinaryProto, StringProto} from '../protos';
import {util} from '../util';
import {AccountContactsService} from './account-contacts.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {ErrorService} from './error.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Account session service.
 */
@Injectable()
export class AccountSessionService extends SessionService {
	/** @ignore */
	private initiated: boolean	= false;

	/** @ignore */
	private resolveAccountsSymmetricKey: (symmetricKey: Uint8Array) => void;

	/** @inheritDoc */
	protected readonly symmetricKey: Promise<Uint8Array>	=
		new Promise<Uint8Array>(resolve => {
			this.resolveAccountsSymmetricKey	= resolve;
		})
	;

	/** @inheritDoc */
	protected async channelOnClose () : Promise<void> {}

	/** Sets the remote user we're chatting with. */
	public async setUser (username: string) : Promise<void> {
		if (this.initiated) {
			throw new Error('User already set.')
		}

		this.initiated	= true;

		(async () => {
			const contactID	= await this.accountContactsService.getContactID(username);

			this.resolveAccountsSymmetricKey(await this.accountDatabaseService.getItem(
				`contacts/${contactID}/session/symmetricKey`,
				BinaryProto
			));

			this.init(contactID, await this.accountDatabaseService.getOrSetDefault(
				`contacts/${contactID}/session/channelUserID`,
				StringProto,
				() => util.uuid()
			));
		})();

		(await this.accountUserLookupService.getUser(username)).realUsername.subscribe(
			this.remoteUsername
		);
	}

	constructor (
		analyticsService: AnalyticsService,
		castleService: CastleService,
		channelService: ChannelService,
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
			errorService,
			potassiumService,
			stringsService
		);
	}
}
