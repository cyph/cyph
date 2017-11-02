import {Observable} from 'rxjs/Observable';
import {take} from 'rxjs/operators/take';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {IRemoteUser} from './iremote-user';


/**
 * A registered user with a long-lived key pair, authenticated via AGSE-PKI.
 */
export class RegisteredRemoteUser implements IRemoteUser {
	/** @ignore */
	private publicKey: Promise<Uint8Array>	= (async () =>
		(
			await this.accountDatabaseService.getUserPublicKeys(
				await this.username.pipe(take(1)).toPromise()
			)
		).encryption
	)();

	/** @inheritDoc */
	public async getPublicKey () : Promise<Uint8Array> {
		return this.publicKey;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @inheritDoc */
		public readonly username: Observable<string>
	) {}
}
