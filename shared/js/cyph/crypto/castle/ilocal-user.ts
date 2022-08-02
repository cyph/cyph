import {IKeyPair, IPrivateKeyring} from '../../proto/types';

/**
 * Represents the local user in a Castle session.
 */
export interface ILocalUser {
	/** Private keyring. If signing key is undefined, handshake will be unsigned. */
	getPrivateKeyring () : Promise<
		IPrivateKeyring & {boxPrivateKeys: Record<string, IKeyPair>}
	>;
}
