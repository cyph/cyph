/**
 * Represents the local user in a Castle session.
 * @interface
 */
export interface ILocalUser {
	/** Potassium.Box key pair. */
	getKeyPair () : Promise<{publicKey: Uint8Array; privateKey: Uint8Array;}>;

	/** Encrypted secret from remote user. */
	getRemoteSecret () : Promise<Uint8Array>;
}
