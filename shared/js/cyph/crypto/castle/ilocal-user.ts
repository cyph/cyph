import {IKeyPair} from '../../proto';


/**
 * Represents the local user in a Castle session.
 */
export interface ILocalUser {
	/** Potassium.Box key pair. */
	getKeyPair () : Promise<IKeyPair>;
}
