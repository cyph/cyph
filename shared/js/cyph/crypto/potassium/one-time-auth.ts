import {sodium} from 'libsodium';
import * as NativeCrypto from './native-crypto';


/** Equivalent to sodium.crypto_onetimeauth. */
export class OneTimeAuth {
	/** MAC length. */
	public readonly bytes: number		=
		this.isNative ?
			NativeCrypto.oneTimeAuth.bytes :
			sodium.crypto_onetimeauth_BYTES
	;

	/** Key length. */
	public readonly keyBytes: number	=
		this.isNative ?
			NativeCrypto.oneTimeAuth.keyBytes :
			sodium.crypto_onetimeauth_KEYBYTES
	;

	/** Signs message. */
	public async sign (
		message: Uint8Array,
		key: Uint8Array
	) : Promise<Uint8Array> {
		return this.isNative ?
			NativeCrypto.oneTimeAuth.sign(
				message,
				key
			) :
			sodium.crypto_onetimeauth(
				message,
				key
			)
		;
	}

	/** Verifies MAC. */
	public async verify (
		mac: Uint8Array,
		message: Uint8Array,
		key: Uint8Array
	) : Promise<boolean> {
		return this.isNative ?
			NativeCrypto.oneTimeAuth.verify(
				mac,
				message,
				key
			) :
			sodium.crypto_onetimeauth_verify(
				mac,
				message,
				key
			)
		;
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean
	) {}
}
