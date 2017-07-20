import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {IRemoteUser} from './iremote-user';


/**
 * A registered user with a long-lived key pair, authenticated via AGSE-PKI.
 */
export class RegisteredRemoteUser implements IRemoteUser {
	/** @ignore */
	private publicKey: Promise<Uint8Array>	= (async () =>
		(
			await this.accountDatabaseService.getUserPublicKeys(await this.username)
		).publicEncryptionKey
	)();

	/** @inheritDoc */
	public async getPublicKey () : Promise<Uint8Array> {
		return this.publicKey;
	}

	/** @inheritDoc */
	public async getUsername () : Promise<string> {
		return this.username;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly username: string|Promise<string>
	) {}
}
