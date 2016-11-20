/**
 * Miscellaneous helper functions for Potassium.
 */
export class PotassiumUtil {
	/** @ignore */
	protected static McEliece: {
		decryptedDataLength: number;
		encryptedDataLength: number;
		privateKeyLength: number;
		publicKeyLength: number;

		decrypt: (encrypted: Uint8Array|string, privateKey: Uint8Array) => Uint8Array;
		encrypt: (message: Uint8Array|string, publicKey: Uint8Array) => Uint8Array;
		keyPair: () => {privateKey: Uint8Array; publicKey: Uint8Array};
	}	= self['mceliece'] || (<any> {});

	/** @ignore */
	protected static NTRU: {
		decryptedDataLength: number;
		encryptedDataLength: number;
		privateKeyLength: number;
		publicKeyLength: number;

		decrypt: (encrypted: Uint8Array|string, privateKey: Uint8Array) => Uint8Array;
		encrypt: (message: Uint8Array|string, publicKey: Uint8Array) => Uint8Array;
		keyPair: () => {privateKey: Uint8Array; publicKey: Uint8Array};
	}	= self['ntru'] || (<any> {});

	/** @ignore */
	protected static RLWE: {
		privateKeyLength: number;
		publicKeyLength: number;
		secretLength: number;

		aliceKeyPair: () => {privateKey: Uint8Array; publicKey: Uint8Array};
		aliceSecret: (publicKey: Uint8Array, privateKey: Uint8Array) => Uint8Array;
		bobSecret: (alicePublicKey: Uint8Array) => {publicKey: Uint8Array; secret: Uint8Array};
	}	= self['rlwe'] || (<any> {});

	/** @ignore */
	protected static Sodium: {
		crypto_aead_chacha20poly1305_ABYTES: number;
		crypto_aead_chacha20poly1305_KEYBYTES: number;
		crypto_aead_chacha20poly1305_NPUBBYTES: number;
		crypto_box_NONCEBYTES: number;
		crypto_box_PUBLICKEYBYTES: number;
		crypto_box_SECRETKEYBYTES: number;
		crypto_onetimeauth_BYTES: number;
		crypto_onetimeauth_KEYBYTES: number;
		crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE: number;
		crypto_pwhash_scryptsalsa208sha256_SALTBYTES: number;
		crypto_scalarmult_BYTES: number;
		crypto_scalarmult_SCALARBYTES: number;

		crypto_aead_chacha20poly1305_decrypt: (
			secretNonce: Uint8Array,
			cyphertext: Uint8Array,
			additionalData: Uint8Array,
			publicNonce: Uint8Array,
			key: Uint8Array
		) => Uint8Array;
		crypto_aead_chacha20poly1305_encrypt: (
			plaintext: Uint8Array,
			additionalData: Uint8Array,
			secretNonce: Uint8Array,
			publicNonce: Uint8Array,
			key: Uint8Array
		) => Uint8Array;
		crypto_box_keypair: () => {keyType: string; privateKey: Uint8Array; publicKey: Uint8Array};
		crypto_box_seal: (plaintext: Uint8Array, publicKey: Uint8Array) => Uint8Array;
		crypto_box_seal_open: (
			cyphertext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) => Uint8Array;
		crypto_generichash: (
			outputBytes: number,
			plaintext: Uint8Array,
			key?: Uint8Array
		) => Uint8Array;
		crypto_onetimeauth: (
			message: Uint8Array,
			key: Uint8Array
		) => Uint8Array;
		crypto_onetimeauth_verify: (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) => boolean;
		crypto_pwhash_scryptsalsa208sha256: (
			keyBytes: number,
			password: Uint8Array,
			salt: Uint8Array,
			opsLimit: number,
			memLimit: number
		) => Uint8Array;
		crypto_scalarmult: (privateKey: Uint8Array, publicKey: Uint8Array) => Uint8Array;
		crypto_scalarmult_base: (privateKey: Uint8Array) => Uint8Array;
		from_base64: (s: string) => Uint8Array;
		from_hex: (s: string) => Uint8Array;
		from_string: (s: string) => Uint8Array;
		memcmp: (a: Uint8Array, b: Uint8Array) => boolean;
		memzero: (a: Uint8Array) => void;
		to_base64: (a: Uint8Array) => string;
		to_hex: (a: Uint8Array) => string;
		to_string: (a: Uint8Array) => string;
	}	= self['sodium'] || {};

	/** @ignore */
	protected static SuperSphincs: {
		bytes: number;
		hashBytes: number;
		privateKeyBytes: number;
		publicKeyBytes: number;

		hash: (message: Uint8Array|string, onlyBinary: boolean) => Uint8Array;
		keyPair: () => Promise<{keyType: string; privateKey: Uint8Array; publicKey: Uint8Array}>;
		open: (signed: Uint8Array|string, publicKey: Uint8Array) => Promise<string>;
		sign: (message: Uint8Array|string, privateKey: Uint8Array) => Promise<string>;
		signDetached: (message: Uint8Array|string, privateKey: Uint8Array) => Promise<string>;
		verifyDetached: (
			signature: Uint8Array|string,
			message: Uint8Array|string,
			publicKey: Uint8Array
		) => Promise<boolean>;
	}	= self['superSphincs'] || (<any> {});

	/** Zeroes out memory. */
	public static clearMemory (a: ArrayBufferView) : void {
		PotassiumUtil.Sodium.memzero(
			PotassiumUtil.toBytes(a)
		);
	}

	/** Indicates whether two blocks of memory contain the same data. */
	public static compareMemory (a: ArrayBufferView, b: ArrayBufferView) : boolean {
		return a.byteLength === b.byteLength && PotassiumUtil.Sodium.memcmp(
			PotassiumUtil.toBytes(a),
			PotassiumUtil.toBytes(b)
		);
	}

	/** Concatenates multiple blocks of memory into one. */
	public static concatMemory (
		clearOriginals: boolean,
		...arrays: ArrayBufferView[]
	) : Uint8Array {
		const out	= new Uint8Array(arrays.reduce((a, b) => a + b.byteLength, 0));
		let index	= 0;

		for (let a of arrays) {
			const array	= PotassiumUtil.toBytes(a);
			out.set(array, index);
			index += array.length;

			if (clearOriginals) {
				PotassiumUtil.clearMemory(array);
			}
		}

		return out;
	}

	/** Converts base64 string into binary byte array. */
	public static fromBase64 (s: string|ArrayBufferView) : Uint8Array {
		return typeof s === 'string' ?
			PotassiumUtil.Sodium.from_base64(s) :
			PotassiumUtil.toBytes(s)
		;
	}

	/** Converts hex string into binary byte array. */
	public static fromHex (s: string|ArrayBufferView) : Uint8Array {
		return typeof s === 'string' ?
			PotassiumUtil.Sodium.from_hex(s) :
			PotassiumUtil.toBytes(s)
		;
	}

	/** Converts ASCII/Unicode string into binary byte array. */
	public static fromString (s: string|ArrayBufferView) : Uint8Array {
		return typeof s === 'string' ?
			PotassiumUtil.Sodium.from_string(s) :
			PotassiumUtil.toBytes(s)
		;
	}

	/** Returns array of n random bytes. */
	public static randomBytes (n: number) : Uint8Array {
		const bytes	= new Uint8Array(n);
		crypto.getRandomValues(bytes);
		return bytes;
	}

	/** Converts binary into base64 string. */
	public static toBase64 (a: ArrayBufferView|string) : string {
		return typeof a === 'string' ?
			a :
			PotassiumUtil.Sodium.to_base64(
				PotassiumUtil.toBytes(a)
			).replace(/\s+/g, '')
		;
	}

	/** Normalises any binary data as standard byte array format. */
	public static toBytes (a: ArrayBufferView) : Uint8Array {
		return new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
	}

	/** Converts binary into hex string. */
	public static toHex (a: ArrayBufferView|string) : string {
		return typeof a === 'string' ?
			a :
			PotassiumUtil.Sodium.to_hex(PotassiumUtil.toBytes(a))
		;
	}

	/** Converts binary into ASCII/Unicode string. */
	public static toString (a: ArrayBufferView|string) : string {
		return typeof a === 'string' ?
			a :
			PotassiumUtil.Sodium.to_string(PotassiumUtil.toBytes(a))
		;
	}
}
