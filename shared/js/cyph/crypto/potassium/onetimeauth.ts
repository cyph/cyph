import {Lib} from './lib';
import * as NativeCrypto from './nativecrypto';


/** Equivalent to sodium.crypto_onetimeauth. */
export class OneTimeAuth {
	/** @ignore */
	private helpers: {
		sign: (
			message: Uint8Array,
			key: Uint8Array
		) => Promise<Uint8Array>;
		verify: (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) => Promise<boolean>;
	}	= {
		sign: async (
			message: Uint8Array,
			key: Uint8Array
		) : Promise<Uint8Array> => Lib.sodium.crypto_onetimeauth(
			message,
			key
		),

		verify: async (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) : Promise<boolean> => Lib.sodium.crypto_onetimeauth_verify(
			mac,
			message,
			key
		)
	};

	/** MAC length. */
	public bytes: number	= Lib.sodium.crypto_onetimeauth_BYTES;

	/** Key length. */
	public keyBytes: number	= Lib.sodium.crypto_onetimeauth_KEYBYTES;

	/** Signs message. */
	public async sign (
		message: Uint8Array,
		key: Uint8Array
	) : Promise<Uint8Array> {
		return this.helpers.sign(
			message,
			key
		);
	}

	/** Verifies MAC. */
	public async verify (
		mac: Uint8Array,
		message: Uint8Array,
		key: Uint8Array
	) : Promise<boolean> {
		return this.helpers.verify(
			mac,
			message,
			key
		);
	}

	constructor (isNative: boolean) {
		if (isNative) {
			this.bytes			= NativeCrypto.OneTimeAuth.bytes;
			this.keyBytes		= NativeCrypto.OneTimeAuth.keyBytes;
			this.helpers.sign	= NativeCrypto.OneTimeAuth.sign;
			this.helpers.verify	= NativeCrypto.OneTimeAuth.verify;
		}
	}
}
