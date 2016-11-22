import {Box} from './box';
import {EphemeralKeyExchange} from './ephemeralkeyexchange';
import {Hash} from './hash';
import {Lib} from './lib';
import * as NativeCrypto from './nativecrypto';
import {OneTimeAuth} from './onetimeauth';
import {PasswordHash} from './passwordhash';
import {SecretBox} from './secretbox';
import {Sign} from './sign';
import {Util} from './util';


/**
 * libsodium-inspired wrapper for the post-quantum primitives used by Cyph.
 * Outside of this class, libsodium and other cryptographic implementations
 * should generally not be called directly.
 */
export class Potassium extends Util {
	/** Indicates whether native crypto API is supported in this environment. */
	public static async isNativeCryptoSupported () : Promise<boolean> {
		try {
			await NativeCrypto.SecretBox.seal(
				Potassium.randomBytes(1),
				Potassium.randomBytes(NativeCrypto.SecretBox.nonceBytes),
				Potassium.randomBytes(NativeCrypto.SecretBox.keyBytes)
			);
			return true;
		}
		catch (_) {
			return false;
		}
	}


	/** @see Box */
	public box: Box;

	/** @see EphemeralKeyExchange */
	public ephemeralKeyExchange: EphemeralKeyExchange;

	/** @see Hash */
	public hash: Hash;

	/** @see OneTimeAuth */
	public oneTimeAuth: OneTimeAuth;

	/** @see PasswordHash */
	public passwordHash: PasswordHash;

	/** @see SecretBox */
	public secretBox: SecretBox;

	/** @see Sign */
	public sign: Sign;

	/** @ignore */
	private newNonce (size: number) : Uint8Array {
		if (size < 4) {
			throw new Error('Nonce size too small.');
		}

		return Potassium.concatMemory(
			true,
			new Uint32Array([this.counter++]),
			Potassium.randomBytes(size - 4)
		);
	}

	/** Indicates whether this Potassium instance is using native crypto. */
	public native () : boolean {
		return this.isNative;
	}

	/**
	 * @param isNative If true, will use NativeCrypto instead of libsodium.
	 * @param counter Initial value of counter for nonces.
	 */
	constructor (
		/** @ignore */
		private isNative: boolean = false,

		/** @ignore */
		private counter: number = 0
	) {
		super();

		const newNonce	= (size: number) => this.newNonce(size);

		this.hash					= new Hash(this.isNative);
		this.oneTimeAuth			= new OneTimeAuth(this.isNative);
		this.secretBox				= new SecretBox(this.isNative, newNonce);
		this.sign					= new Sign();

		this.box					= new Box(
			this.isNative,
			newNonce,
			this.oneTimeAuth,
			this.secretBox
		);
		this.ephemeralKeyExchange	= new EphemeralKeyExchange(this.hash);
		this.passwordHash			= new PasswordHash(this.isNative, this.secretBox);
	}
}
