/**
 * Represents a remote user in a Castle session.
 */
export interface IRemoteUser {
	/** Public Potassium.Box key. */
	getPublicKey () : Promise<Uint8Array>;

	/** User's unique identifier (e.g. "alice"). */
	getUsername () : string;
}
