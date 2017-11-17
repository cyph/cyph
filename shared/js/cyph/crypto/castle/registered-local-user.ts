import {IKeyPair} from '../../proto';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {ILocalUser} from './ilocal-user';


/**
 * A registered user with a long-lived key pair, authenticated via AGSE-PKI.
 */
export class RegisteredLocalUser implements ILocalUser {
	/** @inheritDoc */
	public async getKeyPair () : Promise<IKeyPair> {
		return (await this.accountDatabaseService.getCurrentUser()).keys.encryptionKeyPair;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {}
}
