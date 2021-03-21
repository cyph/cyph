import {Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {filterEmptyOperator} from '../../util/filter';
import {IRemoteUser} from './iremote-user';

/**
 * A registered user with a long-lived key pair, authenticated via AGSE-PKI.
 */
export class RegisteredRemoteUser implements IRemoteUser {
	/** @ignore */
	private keys?: Promise<{encryption: Uint8Array; signing?: Uint8Array}>;

	/** @ignore */
	private async getKeys () : Promise<{
		encryption: Uint8Array;
		signing?: Uint8Array;
	}> {
		if (!this.keys) {
			this.keys = (async () => {
				const username = await this.username
					.pipe(filterEmptyOperator(), take(1))
					.toPromise();

				if (this.pseudoAccount) {
					return {encryption: new Uint8Array(0)};
				}

				return this.accountDatabaseService.getUserPublicKeys(username);
			})();
		}

		return this.keys;
	}

	/** @inheritDoc */
	public async getPublicEncryptionKey () : Promise<Uint8Array> {
		return (await this.getKeys()).encryption;
	}

	/** @inheritDoc */
	public async getPublicSigningKey () : Promise<Uint8Array | undefined> {
		return (await this.getKeys()).signing;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly pseudoAccount: boolean,

		/** @inheritDoc */
		public readonly username: Observable<string>
	) {}
}
