import {Observable} from 'rxjs';
import {IPublicKeyring} from '../../proto/types';

/**
 * Represents a remote user in a Castle session.
 */
export interface IRemoteUser {
	/** User's unique identifier (e.g. "friend" or "alice"). */
	readonly username: Observable<string>;

	/**
	 * Public keyring. If signing key is undefined, handshake will be unsigned.
	 * If a signed handshake is expected and a public signing key cannot be found,
	 * this method should throw an exception.
	 */
	getPublicKeyring () : Promise<IPublicKeyring>;
}
