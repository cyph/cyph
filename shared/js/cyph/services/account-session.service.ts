import {Injectable} from '@angular/core';
import {BinaryProto} from '../protos';
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
	/** @inheritDoc */
	protected readonly symmetricKey: Promise<Uint8Array>	= (async () =>
		this.accountDatabaseService.getItem(
			`contacts/${await this.remoteUsername.take(1).toPromise()}/session/symmetricKey`,
			BinaryProto
		)
	)();

	/** @inheritDoc */
	protected async channelOnClose () : Promise<void> {}

	/** Sets the remote user we're chatting with. */
	public async setUser (username: string) : Promise<void> {
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

		this.init();
	}
}
