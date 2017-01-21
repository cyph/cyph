import {Box} from './box';
import {EphemeralKeyExchange} from './ephemeral-key-exchange';
import {Hash} from './hash';
import {OneTimeAuth} from './one-time-auth';
import {PasswordHash} from './password-hash';
import {PotassiumUtil} from './potassium-util';
import {SecretBox} from './secret-box';
import {Sign} from './sign';


/**
 * libsodium-inspired wrapper for the post-quantum primitives used by Cyph.
 * Outside of this class, libsodium and other cryptographic implementations
 * should generally not be called directly.
 */
export interface IPotassium extends PotassiumUtil {
	/** @see Box */
	readonly box: Box;

	/** @see EphemeralKeyExchange */
	readonly ephemeralKeyExchange: EphemeralKeyExchange;

	/** @see Hash */
	readonly hash: Hash;

	/** @see OneTimeAuth */
	readonly oneTimeAuth: OneTimeAuth;

	/** @see PasswordHash */
	readonly passwordHash: PasswordHash;

	/** @see SecretBox */
	readonly secretBox: SecretBox;

	/** @see Sign */
	readonly sign: Sign;

	/** Indicates whether this Potassium instance is using native crypto. */
	native () : boolean;
}
