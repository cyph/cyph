import {Box} from './box';
import {EphemeralKeyExchange} from './ephemeral-key-exchange';
import {Hash} from './hash';
import {IPotassium} from './ipotassium';
import {isNativeCryptoSupported} from './is-native-crypto-supported';
import {OneTimeAuth} from './one-time-auth';
import {PasswordHash} from './password-hash';
import {PotassiumUtil} from './potassium-util';
import {SecretBox} from './secret-box';
import {Sign} from './sign';


/**
 * @inheritDoc
 */
export class Potassium extends PotassiumUtil implements IPotassium {
	/** @inheritDoc */
	public readonly box: Box;

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: EphemeralKeyExchange;

	/** @inheritDoc */
	public readonly hash: Hash;

	/** @inheritDoc */
	public readonly oneTimeAuth: OneTimeAuth;

	/** @inheritDoc */
	public readonly passwordHash: PasswordHash;

	/** @inheritDoc */
	public readonly secretBox: SecretBox;

	/** @inheritDoc */
	public readonly sign: Sign;

	/** @inheritDoc */
	public async isNativeCryptoSupported () : Promise<boolean> {
		return isNativeCryptoSupported();
	}

	/** @inheritDoc */
	public async native () : Promise<boolean> {
		return this.isNative;
	}

	/**
	 * @param isNative If true, will use NativeCrypto instead of libsodium.
	 */
	constructor (
		/** @ignore */
		private readonly isNative: boolean = false
	) {
		super();

		this.hash					= new Hash(this.isNative);
		this.oneTimeAuth			= new OneTimeAuth(this.isNative);
		this.sign					= new Sign();

		this.secretBox				= new SecretBox(this.isNative, this.hash);
		this.box					= new Box(this.isNative, this.oneTimeAuth, this.secretBox);
		this.ephemeralKeyExchange	= new EphemeralKeyExchange(this.hash);
		this.passwordHash			= new PasswordHash(this.isNative, this.hash, this.secretBox);
	}
}
