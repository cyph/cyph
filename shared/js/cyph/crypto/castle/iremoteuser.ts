/**
 * Represents a remote user in a Castle session.
 * @interface
 */
export interface IRemoteUser {
	/** Public Potassium.Box key. */
	getPublicKey () : Promise<Uint8Array>;

	/** User's unique identifier (e.g. "alice" or "friend"). */
	getUsername () : string;
}
