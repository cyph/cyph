import {sodium} from 'libsodium';
import {IOneTimeAuth} from './ione-time-auth';
import * as NativeCrypto from './native-crypto';


/** @inheritDoc */
export class OneTimeAuth implements IOneTimeAuth {
	/** @inheritDoc */
	public readonly bytes: Promise<number>		= sodium.ready.then(() =>
		this.isNative ?
			NativeCrypto.oneTimeAuth.bytes :
			sodium.crypto_onetimeauth_BYTES
	);

	/** @inheritDoc */
	public readonly keyBytes: Promise<number>	= sodium.ready.then(() =>
		this.isNative ?
			NativeCrypto.oneTimeAuth.keyBytes :
			sodium.crypto_onetimeauth_KEYBYTES
	);

	/** @inheritDoc */
	public async sign (
		message: Uint8Array,
		key: Uint8Array
	) : Promise<Uint8Array> {
		return this.isNative ?
			NativeCrypto.oneTimeAuth.sign(message, key) :
			sodium.ready.then(() => sodium.crypto_onetimeauth(message, key))
		;
	}

	/** @inheritDoc */
	public async verify (
		mac: Uint8Array,
		message: Uint8Array,
		key: Uint8Array
	) : Promise<boolean> {
		return this.isNative ?
			NativeCrypto.oneTimeAuth.verify(mac, message, key) :
			sodium.ready.then(() => sodium.crypto_onetimeauth_verify(mac, message, key))
		;
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean
	) {}
}
