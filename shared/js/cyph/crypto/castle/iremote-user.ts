import {Observable} from 'rxjs';


/**
 * Represents a remote user in a Castle session.
 */
export interface IRemoteUser {
	/** User's unique identifier (e.g. "friend" or "alice"). */
	readonly username: Observable<string>;

	/** Public Potassium.Box key. */
	getPublicKey () : Promise<Uint8Array>;
}
