/**
 * User login data.
 */
export interface ILoginData {
	/** Randomly generated password for database authentication. */
	secondaryPassword: string;

	/** Base64-encoded key for encrypting user data. */
	symmetricKey: string;
}
