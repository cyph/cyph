import {IAccountLoginData, IKeyPair} from '../proto';
import {User} from './user';


/** Current user data. */
export interface ICurrentUser {
	/** Indicates whether the current User's account has been certified via AGSE-PKI. */
	confirmed: boolean;

	/** User secret keys. */
	keys: {
		encryptionKeyPair: IKeyPair;
		signingKeyPair: IKeyPair;
		symmetricKey: Uint8Array;
	};

	/** @see IAccountLoginData */
	loginData: IAccountLoginData;

	/** @see User */
	user: User;
}
