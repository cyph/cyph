import {Lib} from '../lib';
import {Util} from '../util';
import {ImportHelper} from './importhelper';
import {SecretBox} from './secretbox';


/** Equivalent to sodium.crypto_pwhash. */
export class PasswordHash {
	/** Algorithm details. */
	public static readonly algorithm: {
		hash: {name: string};
		name: string;
	}	= {
		hash: {
			name: 'SHA-512'
		},
		name: 'PBKDF2'
	};

	/** Mem limit not used by PBKDF2. */
	public static readonly memLimitInteractive: number	= 0;

	/** Mem limit not used by PBKDF2. */
	public static readonly memLimitSensitive: number	= 0;

	/** Moderate ops limit. */
	public static readonly opsLimitInteractive: number	= 250000;

	/** Heavy ops limit. */
	public static readonly opsLimitSensitive: number	= 2500000;

	/** Salt length. */
	public static readonly saltBytes: number			= 32;

	/** Hashes plaintext. */
	public static async hash (
		plaintext: Uint8Array,
		salt: Uint8Array = Util.randomBytes(
			PasswordHash.saltBytes
		),
		outputBytes: number = SecretBox.keyBytes,
		opsLimit: number = PasswordHash.opsLimitInteractive,
		memLimit: number = PasswordHash.memLimitInteractive
	) : Promise<Uint8Array> {
		return new Uint8Array(
			await Lib.subtleCrypto.deriveBits(
				{
					salt,
					hash: PasswordHash.algorithm.hash,
					iterations: opsLimit,
					name: PasswordHash.algorithm.name
				},
				await ImportHelper.importRawKey(
					plaintext,
					PasswordHash.algorithm,
					'deriveBits'
				),
				outputBytes * 8
			)
		);
	}
}
