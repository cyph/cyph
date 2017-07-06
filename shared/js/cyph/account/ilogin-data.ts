/**
 * User login data.
 */
export interface ILoginData {
	/** Randomly generated password for database authentication. */
	secondaryPassword: string;

	/** Symmetric key for encrypting user data. */
	symmetricKey: Uint8Array;
}
