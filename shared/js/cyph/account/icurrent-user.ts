import {IAccountLoginData, IKeyPair} from '../proto';
import {User} from './user';

/** Current user data. */
export interface ICurrentUser {
	/** Indicates whether the current User's account has been certified via AGSE-PKI. */
	agseConfirmed: boolean;

	/** User secret keys. */
	keys: {
		encryptionKeyPair: IKeyPair;
		signingKeyPair: IKeyPair;
		symmetricKey: Uint8Array;
	};

	/** @see IAccountLoginData */
	loginData: IAccountLoginData;

	/** Indicates whether user has done their one-time master key confirmation. */
	masterKeyConfirmed: boolean;

	/** Indicates whether this is a pseudo-account. */
	pseudoAccount: boolean;

	/** @see User */
	user: User;
}
