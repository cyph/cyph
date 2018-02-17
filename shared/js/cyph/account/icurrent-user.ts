import {IKeyPair} from '../proto';
import {User} from './user';


/** Current user data. */
export interface ICurrentUser {
	/** User secret keys. */
	keys: {
		encryptionKeyPair: IKeyPair;
		signingKeyPair: IKeyPair;
		symmetricKey: Uint8Array;
	};

	/** @see User */
	user: User;
}
