import {Lib} from '../lib';
import {ImportHelper} from './importhelper';


/** Equivalent to sodium.crypto_onetimeauth. */
export class OneTimeAuth {
	/** Algorithm details. */
	public static algorithm: {
		hash: {name: string};
		name: string;
	}	= {
		hash: {
			name: 'SHA-512'
		},
		name: 'HMAC'
	};

	/** MAC length. */
	public static bytes: number		= 64;

	/** Key length. */
	public static keyBytes: number	= 64;

	/** Signs message. */
	public static async sign (
		message: Uint8Array,
		key: Uint8Array
	) : Promise<Uint8Array> {
		return new Uint8Array(
			await Lib.subtleCrypto.sign(
				OneTimeAuth.algorithm,
				await ImportHelper.importRawKey(
					key,
					OneTimeAuth.algorithm,
					'sign'
				),
				message
			)
		);
	}

	/** Verifies MAC. */
	public static async verify (
		mac: Uint8Array,
		message: Uint8Array,
		key: Uint8Array
	) : Promise<boolean> {
		return Lib.subtleCrypto.verify(
			OneTimeAuth.algorithm,
			await ImportHelper.importRawKey(
				key,
				OneTimeAuth.algorithm,
				'verify'
			),
			mac,
			message
		);
	}
}
