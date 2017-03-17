/**
 * Represents a remote user in a Castle session.
 */
export interface IRemoteUser {
	/** Public Potassium.Box key. */
	getPublicKey () : Promise<Uint8Array>;

	/** User's unique identifier (e.g. "friend" or "alice"). */
	getUsername () : Promise<string>;
}
