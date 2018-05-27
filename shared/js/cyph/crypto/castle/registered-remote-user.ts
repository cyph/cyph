import {Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {IAccountUserPublicKeys} from '../../proto';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {IRemoteUser} from './iremote-user';


/**
 * A registered user with a long-lived key pair, authenticated via AGSE-PKI.
 */
export class RegisteredRemoteUser implements IRemoteUser {
	/** @ignore */
	private keys?: Promise<IAccountUserPublicKeys>;

	/** @ignore */
	private async getKeys () : Promise<IAccountUserPublicKeys> {
		if (!this.keys) {
			this.keys	= (async () =>
				this.accountDatabaseService.getUserPublicKeys(
					await this.username.pipe(take(1)).toPromise()
				)
			)();
		}

		return this.keys;
	}

	/** @inheritDoc */
	public async getPublicEncryptionKey () : Promise<Uint8Array> {
		return (await this.getKeys()).encryption;
	}

	/** @inheritDoc */
	public async getPublicSigningKey () : Promise<Uint8Array> {
		return (await this.getKeys()).signing;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @inheritDoc */
		public readonly username: Observable<string>
	) {}
}
