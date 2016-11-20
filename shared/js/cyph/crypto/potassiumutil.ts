/**
 * Miscellaneous helper functions for Potassium.
 */
export class PotassiumUtil {
	/** @ignore */
	protected static McEliece		= self['mceliece'] || {};

	/** @ignore */
	protected static NTRU			= self['ntru'] || {};

	/** @ignore */
	protected static RLWE			= self['rlwe'] || {};

	/** @ignore */
	protected static Sodium			= self['sodium'] || {};

	/** @ignore */
	protected static SuperSphincs	= self['superSphincs'] || {};

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
