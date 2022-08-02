import memoize from 'lodash-es/memoize';
import {firstValueFrom, Observable} from 'rxjs';
import {IPublicKeyring} from '../../proto/types';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {filterEmptyOperator} from '../../util/filter';
import {IRemoteUser} from './iremote-user';

/**
 * A registered user with a long-lived key pair, authenticated via AGSE-PKI.
 */
export class RegisteredRemoteUser implements IRemoteUser {
	/** @inheritDoc */
	public readonly getPublicKeyring = memoize(
		async () : Promise<IPublicKeyring> => {
			const username = await firstValueFrom(
				this.username.pipe(filterEmptyOperator())
			);

			if (this.pseudoAccount) {
				return {};
			}

			return this.accountDatabaseService.getUserPublicKeys(username);
		}
	);

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly pseudoAccount: boolean,

		/** @inheritDoc */
		public readonly username: Observable<string>
	) {}
}
