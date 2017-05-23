import {potassiumUtil} from '../potassium-util';
import {importHelper} from './import-helper';
import {secretBox} from './secret-box';


/** Equivalent to sodium.crypto_pwhash. */
export class PasswordHash {
	/** Algorithm details. */
	public readonly algorithm: {
		hash: {name: string};
		name: string;
	}	= {
		hash: {
			name: 'SHA-512'
		},
		name: 'PBKDF2'
	};

	/** Mem limit not used by PBKDF2. */
	public readonly memLimitInteractive: number	= 0;

	/** Mem limit not used by PBKDF2. */
	public readonly memLimitSensitive: number	= 0;

	/** Moderate ops limit. */
	public readonly opsLimitInteractive: number	= 250000;

	/** Heavy ops limit. */
	public readonly opsLimitSensitive: number	= 2500000;

	/** Salt length. */
	public readonly saltBytes: number			= 32;

	/** Hashes plaintext. */
	public async hash (
		plaintext: Uint8Array,
		salt: Uint8Array = potassiumUtil.randomBytes(
			this.saltBytes
		),
		outputBytes: number = secretBox.keyBytes,
		opsLimit: number = this.opsLimitInteractive,
		_MEM_LIMIT: number = this.memLimitInteractive
	) : Promise<Uint8Array> {
		return new Uint8Array(
			await crypto.subtle.deriveBits(
				{
					hash: this.algorithm.hash,
					iterations: opsLimit,
					name: this.algorithm.name,
					salt
				},
				await importHelper.importRawKey(
					plaintext,
					this.algorithm,
					'deriveBits'
				),
				outputBytes * 8
			)
		);
	}

	constructor () {}
}

/** @see PasswordHash */
export const passwordHash	= new PasswordHash();
