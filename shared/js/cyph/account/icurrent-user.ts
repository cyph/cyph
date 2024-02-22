import type {
	IAccountLoginData,
	IPrivateKeyring,
	IPublicKeyring
} from '../proto/types';
import type {User} from './user';

/** Current user data. */
export interface ICurrentUser {
	/** Indicates whether the current User's account has been certified via AGSE-PKI. */
	agseConfirmed: boolean;

	/** User keyrings. */
	keyrings: {
		private: IPrivateKeyring;
		public: IPublicKeyring;
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
