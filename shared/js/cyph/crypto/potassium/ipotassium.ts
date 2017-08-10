import {IBox} from './ibox';
import {IEphemeralKeyExchange} from './iephemeral-key-exchange';
import {IHash} from './ihash';
import {IOneTimeAuth} from './ione-time-auth';
import {IPasswordHash} from './ipassword-hash';
import {ISecretBox} from './isecret-box';
import {ISign} from './isign';
import {PotassiumUtil} from './potassium-util';


/**
 * libsodium-inspired wrapper for the post-quantum primitives used by Cyph.
 * Outside of this class, libsodium and other cryptographic implementations
 * should generally not be called directly.
 */
export interface IPotassium extends PotassiumUtil {
	/** @see IBox */
	readonly box: IBox;

	/** @see IEphemeralKeyExchange */
	readonly ephemeralKeyExchange: IEphemeralKeyExchange;

	/** @see IHash */
	readonly hash: IHash;

	/** @see IOneTimeAuth */
	readonly oneTimeAuth: IOneTimeAuth;

	/** @see IPasswordHash */
	readonly passwordHash: IPasswordHash;

	/** @see ISecretBox */
	readonly secretBox: ISecretBox;

	/** @see ISign */
	readonly sign: ISign;

	/** Indicates whether native crypto API is supported in this environment. */
	isNativeCryptoSupported () : Promise<boolean>;

	/** Indicates whether this Potassium instance is using native crypto. */
	native () : Promise<boolean>;
}
