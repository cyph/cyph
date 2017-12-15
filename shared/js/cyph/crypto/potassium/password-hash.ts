import {sodium} from 'libsodium';
import {IHash} from './ihash';
import {IPasswordHash} from './ipassword-hash';
import {ISecretBox} from './isecret-box';
import * as NativeCrypto from './native-crypto';
import {potassiumUtil} from './potassium-util';


/** @inheritDoc */
export class PasswordHash implements IPasswordHash {
	/** @ignore */
	private readonly helpers: {
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
		) : Promise<Uint8Array> =>
			this.isNative ?
				NativeCrypto.passwordHash.hash(
					plaintext,
					salt,
					outputBytes,
					opsLimit,
					memLimit
				) :
				sodium.ready.then(() => sodium.crypto_pwhash(
					outputBytes,
					plaintext,
					salt,
					opsLimit,
					memLimit,
					sodium.crypto_pwhash_ALG_DEFAULT
				))
	};

	/** @inheritDoc */
	public readonly algorithm: Promise<string>				= Promise.resolve(
		this.isNative ?
			(
				NativeCrypto.passwordHash.algorithm.name + '/' +
				NativeCrypto.passwordHash.algorithm.hash.name
			) :
			'argon2'
	);

	/** @inheritDoc */
	public readonly memLimitInteractive: Promise<number>	= sodium.ready.then(() =>
		this.isNative ?
			NativeCrypto.passwordHash.memLimitInteractive :
			16777216 /* 16 MB */
	);

	/** @inheritDoc */
	public readonly memLimitSensitive: Promise<number>		= Promise.resolve(
		this.isNative ?
			NativeCrypto.passwordHash.memLimitSensitive :
			134217728 /* 128 MB */
	);

	/** @inheritDoc */
	public readonly opsLimitInteractive: Promise<number>	= sodium.ready.then(() =>
		this.isNative ?
			NativeCrypto.passwordHash.opsLimitInteractive :
			3
	);

	/** @inheritDoc */
	public readonly opsLimitSensitive: Promise<number>		= sodium.ready.then(() =>
		this.isNative ?
			NativeCrypto.passwordHash.opsLimitSensitive :
			6
	);

	/** @inheritDoc */
	public readonly saltBytes: Promise<number>				= sodium.ready.then(() =>
		this.isNative ?
			NativeCrypto.passwordHash.saltBytes :
			sodium.crypto_pwhash_SALTBYTES
	);

	/** @inheritDoc */
	public async hash (
		plaintext: Uint8Array|string,
		salt?: Uint8Array|string,
		outputBytes?: number,
		opsLimit?: number,
		memLimit?: number,
		clearInput?: boolean
	) : Promise<{
		hash: Uint8Array;
		metadata: Uint8Array;
		metadataObject: {
			algorithm: string;
			memLimit: number;
			opsLimit: number;
			salt: Uint8Array;
		};
	}> {
		const algorithm	= await this.algorithm;
		const saltBytes	= await this.saltBytes;

		if (salt === undefined) {
			salt	= potassiumUtil.randomBytes(saltBytes);
		}
		else if (typeof salt === 'string' || salt.length !== saltBytes) {
			salt	= await this.potassiumHash.deriveKey(
				salt,
				saltBytes,
				typeof salt === 'string'
			);
		}

		if (outputBytes === undefined) {
			outputBytes	= await this.secretBox.keyBytes;
		}
		if (opsLimit === undefined) {
			opsLimit	= await this.opsLimitInteractive;
		}
		if (memLimit === undefined) {
			memLimit	= await this.memLimitInteractive;
		}

		const plaintextBinary	= potassiumUtil.fromString(plaintext);

		try {
			const metadata	= potassiumUtil.concatMemory(
				false,
				new Uint32Array([memLimit]),
				new Uint32Array([opsLimit]),
				new Uint32Array([salt.length]),
				salt,
				potassiumUtil.fromString(algorithm)
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
					algorithm,
					memLimit,
					opsLimit,
					salt
				}
			};
		}
		finally {
			if (clearInput) {
				potassiumUtil.clearMemory(plaintextBinary);
				potassiumUtil.clearMemory(salt);
			}
			else if (typeof plaintext === 'string') {
				potassiumUtil.clearMemory(plaintextBinary);
			}
		}
	}

	/** @inheritDoc */
	public async parseMetadata (metadata: Uint8Array) : Promise<{
		algorithm: string;
		memLimit: number;
		opsLimit: number;
		salt: Uint8Array;
	}> {
		const metadataView	= potassiumUtil.toDataView(metadata);
		const saltBytes		= metadataView.getUint32(8, true);

		return {
			algorithm: potassiumUtil.toString(
				potassiumUtil.toBytes(metadata, saltBytes + 12)
			),
			memLimit: metadataView.getUint32(0, true),
			opsLimit: metadataView.getUint32(4, true),
			salt: potassiumUtil.toBytes(metadata, 12, saltBytes)
		};
	}

	constructor (
		/** @ignore */
		private readonly isNative: boolean,

		/** @ignore */
		private readonly potassiumHash: IHash,

		/** @ignore */
		private readonly secretBox: ISecretBox
	) {}
}
