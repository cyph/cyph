/**
 * Represents the local user in a Castle session.
 * @interface
 */
export interface ILocalUser {
	/** Public Potassium.Box key. */
	getInitialSecret () : Promise<Uint8Array>;

	/** Potassium.Box key pair. */
	getKeyPair () : Promise<{publicKey: Uint8Array; privateKey: Uint8Array;}>;
}
