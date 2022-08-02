import memoize from 'lodash-es/memoize';
import {IKeyPair, IPrivateKeyring} from '../../proto/types';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {ILocalUser} from './ilocal-user';

/**
 * A registered user with a long-lived key pair, authenticated via AGSE-PKI.
 */
export class RegisteredLocalUser implements ILocalUser {
	/** @inheritDoc */
	public readonly getPrivateKeyring = memoize(
		async () : Promise<
			IPrivateKeyring & {boxPrivateKeys: Record<string, IKeyPair>}
		> => {
			const {boxPrivateKeys, ...privateKeyring} = (
				await this.accountDatabaseService.getCurrentUser()
			).keyrings.private;

			if (boxPrivateKeys === undefined) {
				throw new Error('Private keyring is missing box key pair.');
			}

			return {...privateKeyring, boxPrivateKeys};
		}
	);

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {}
}
