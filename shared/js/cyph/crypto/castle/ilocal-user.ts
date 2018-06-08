import {IKeyPair} from '../../proto';


/**
 * Represents the local user in a Castle session.
 */
export interface ILocalUser {
	/** Potassium.Box key pair. */
	getEncryptionKeyPair () : Promise<IKeyPair>;

	/** Potassium.Sign key pair. If undefined, handshake will be unsigned. */
	getSigningKeyPair () : Promise<IKeyPair|undefined>;
}
