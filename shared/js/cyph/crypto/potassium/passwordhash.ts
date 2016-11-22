import {Lib} from './lib';
import * as NativeCrypto from './nativecrypto';
import {SecretBox} from './secretbox';
import {Util} from './util';


/** Equivalent to sodium.crypto_pwhash. */
export class PasswordHash {
	/** @ignore */
	private helpers: {
		hash: (
			plaintext: Uint8Array,
			salt: Uint8Array,
			outputBytes: number,
			opsLimit: number,
			memLimit: number
		) => Promise<Uint8Array>;
	}	= {
		hash: async (
			plaintext: Uint8Array,
			salt: Uint8Array,
			outputBytes: number,
			opsLimit: number,
			memLimit: number
		) : Promise<Uint8Array> => Lib.sodium.crypto_pwhash_scryptsalsa208sha256(
			outputBytes,
			plaintext,
			salt,
			opsLimit,
			memLimit
		)
	};

	/** Algorithm name. */
	public algorithm: string	= 'scrypt';

	/** Moderate mem limit. */
	public memLimitInteractive: number	=
		Lib.sodium.crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE
	;

	/** Heavy mem limit. */
	public memLimitSensitive: number	=
		134217728 /* 128 MB */
	;

	/** Moderate ops limit. */
	public opsLimitInteractive: number	=
		Lib.sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE
	;

	/** Heavy ops limit. */
	public opsLimitSensitive: number	=
		Lib.sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE
	;

	/** Salt length. */
	public saltBytes: number	=
		Lib.sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES
	;

	/** Hashes plaintext. */
	public async hash (
		plaintext: Uint8Array|string,
		salt: Uint8Array = Util.randomBytes(
			this.saltBytes
		),
		outputBytes: number = this.secretBox.keyBytes,
		opsLimit: number = this.opsLimitInteractive,
		memLimit: number = this.memLimitInteractive,
		clearInput?: boolean
	) : Promise<{
		hash: Uint8Array;
		metadata: Uint8Array,
		metadataObject: {
			algorithm: string;
			memLimit: number;
			opsLimit: number;
			salt: Uint8Array;
		};
	}> {
		const plaintextBinary: Uint8Array	= Util.fromString(plaintext);

		try {
			const algorithm: Uint8Array	= Util.fromString(
				this.algorithm
			);

			const metadata: Uint8Array	= Util.concatMemory(
				false,
				new Uint8Array(new Uint32Array([memLimit]).buffer),
				new Uint8Array(new Uint32Array([opsLimit]).buffer),
				new Uint8Array(new Uint32Array([salt.length]).buffer),
				salt,
				algorithm
			);

			return {
				hash: await this.helpers.hash(
					plaintextBinary,
					salt,
					outputBytes,
					opsLimit,
					memLimit
				),
				metadata,
				metadataObject: {
					algorithm: this.algorithm,
					memLimit,
					opsLimit,
					salt
				}
			};
		}
		finally {
			if (clearInput) {
				Util.clearMemory(plaintextBinary);
				Util.clearMemory(salt);
			}
			else if (typeof plaintext !== 'Uint8Array') {
				Util.clearMemory(plaintextBinary);
			}
		}
	}

	/** Parses metadata byte array into usable object. */
	public async parseMetadata (metadata: Uint8Array) : Promise<{
		algorithm: string;
		memLimit: number;
		opsLimit: number;
		salt: Uint8Array;
	}> {
		metadata	= new Uint8Array(metadata);

		try {
			const saltBytes: number	= new Uint32Array(metadata.buffer, 2, 1)[0];

			return {
				algorithm: Util.toString(new Uint8Array(metadata.buffer, 12 + saltBytes)),
				memLimit: new Uint32Array(metadata.buffer, 0, 1)[0],
				opsLimit: new Uint32Array(metadata.buffer, 1, 1)[0],
				salt: new Uint8Array(new Uint8Array(metadata.buffer, 12, saltBytes))
			};
		}
		finally {
			Util.clearMemory(metadata);
		}
	}

	constructor (
		isNative: boolean,

		/** @ignore */
		private secretBox: SecretBox
	) {
		if (isNative) {
			this.algorithm				=
				NativeCrypto.PasswordHash.algorithm.name + '/' +
				NativeCrypto.PasswordHash.algorithm.hash.name
			;
			this.memLimitInteractive	=
				NativeCrypto.PasswordHash.memLimitInteractive
			;
			this.memLimitSensitive		=
				NativeCrypto.PasswordHash.memLimitSensitive
			;
			this.opsLimitInteractive	=
				NativeCrypto.PasswordHash.opsLimitInteractive
			;
			this.opsLimitSensitive		=
				NativeCrypto.PasswordHash.opsLimitSensitive
			;
			this.saltBytes				=
				NativeCrypto.PasswordHash.saltBytes
			;
			this.helpers.hash			=
				NativeCrypto.PasswordHash.hash
			;
		}
	}
}
