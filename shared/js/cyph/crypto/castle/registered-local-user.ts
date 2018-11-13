import {IKeyPair} from '../../proto';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {ILocalUser} from './ilocal-user';


/**
 * A registered user with a long-lived key pair, authenticated via AGSE-PKI.
 */
export class RegisteredLocalUser implements ILocalUser {
	/** @ignore */
	private keyPairs?: Promise<{encryption: IKeyPair; signing?: IKeyPair}>;

	/** @ignore */
	private async getKeyPairs () : Promise<{encryption: IKeyPair; signing?: IKeyPair}> {
		if (!this.keyPairs) {
			this.keyPairs	= this.accountDatabaseService.getCurrentUser().then(
				({keys, pseudoAccount}) => ({
					encryption: keys.encryptionKeyPair,
					signing: pseudoAccount ? undefined : keys.signingKeyPair
				})
			);
		}

		return this.keyPairs;
	}

	/** @inheritDoc */
	public async getEncryptionKeyPair () : Promise<IKeyPair> {
		return (await this.getKeyPairs()).encryption;
	}

	/** @inheritDoc */
	public async getSigningKeyPair () : Promise<IKeyPair|undefined> {
		return (await this.getKeyPairs()).signing;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {}
}
