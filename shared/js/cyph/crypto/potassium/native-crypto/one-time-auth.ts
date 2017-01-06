import {importHelper} from './import-helper';


/** Equivalent to sodium.crypto_onetimeauth. */
export class OneTimeAuth {
	/** Algorithm details. */
	public readonly algorithm: {
		hash: {name: string};
		name: string;
	}	= {
		hash: {
			name: 'SHA-512'
		},
		name: 'HMAC'
	};

	/** MAC length. */
	public readonly bytes: number		= 64;

	/** Key length. */
	public readonly keyBytes: number	= 64;

	/** Signs message. */
	public async sign (
		message: Uint8Array,
		key: Uint8Array
	) : Promise<Uint8Array> {
		return new Uint8Array(
			await crypto.subtle.sign(
				this.algorithm,
				await importHelper.importRawKey(
					key,
					this.algorithm,
					'sign'
				),
				message
			)
		);
	}

	/** Verifies MAC. */
	public async verify (
		mac: Uint8Array,
		message: Uint8Array,
		key: Uint8Array
	) : Promise<boolean> {
		return crypto.subtle.verify(
			this.algorithm,
			await importHelper.importRawKey(
				key,
				this.algorithm,
				'verify'
			),
			mac,
			message
		);
	}

	constructor () {}
}

/** @see OneTimeAuth */
export const oneTimeAuth	= new OneTimeAuth();
