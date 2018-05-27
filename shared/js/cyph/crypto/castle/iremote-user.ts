import {Observable} from 'rxjs';


/**
 * Represents a remote user in a Castle session.
 */
export interface IRemoteUser {
	/** User's unique identifier (e.g. "friend" or "alice"). */
	readonly username: Observable<string>;

	/** Public Potassium.Box key. */
	getPublicEncryptionKey () : Promise<Uint8Array>;

	/**
	 * Public Potassium.Sign key. If undefined, handshake will be unsigned.
	 * If a signed handshake is expected and a public signing key cannot be found,
	 * this method should throw an exception.
	 */
	getPublicSigningKey () : Promise<Uint8Array|undefined>;
}
