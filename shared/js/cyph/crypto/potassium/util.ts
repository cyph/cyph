import {Lib} from './lib';


/**
 * Miscellaneous helper functions for Potassium.
 */
export class Util {
	/** Zeroes out memory. */
	public static clearMemory (a: ArrayBufferView) : void {
		Lib.sodium.memzero(
			Util.toBytes(a)
		);
	}

	/** Indicates whether two blocks of memory contain the same data. */
	public static compareMemory (a: ArrayBufferView, b: ArrayBufferView) : boolean {
		return a.byteLength === b.byteLength && Lib.sodium.memcmp(
			Util.toBytes(a),
			Util.toBytes(b)
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
			const array	= Util.toBytes(a);
			out.set(array, index);
			index += array.length;

			if (clearOriginals) {
				Util.clearMemory(array);
			}
		}

		return out;
	}

	/** Converts base64 string into binary byte array. */
	public static fromBase64 (s: string|ArrayBufferView) : Uint8Array {
		return typeof s === 'string' ?
			Lib.sodium.from_base64(s) :
			Util.toBytes(s)
		;
	}

	/** Converts hex string into binary byte array. */
	public static fromHex (s: string|ArrayBufferView) : Uint8Array {
		return typeof s === 'string' ?
			Lib.sodium.from_hex(s) :
			Util.toBytes(s)
		;
	}

	/** Converts ASCII/Unicode string into binary byte array. */
	public static fromString (s: string|ArrayBufferView) : Uint8Array {
		return typeof s === 'string' ?
			Lib.sodium.from_string(s) :
			Util.toBytes(s)
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
			Lib.sodium.to_base64(
				Util.toBytes(a)
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
			Lib.sodium.to_hex(Util.toBytes(a))
		;
	}

	/** Converts binary into ASCII/Unicode string. */
	public static toString (a: ArrayBufferView|string) : string {
		return typeof a === 'string' ?
			a :
			Lib.sodium.to_string(Util.toBytes(a))
		;
	}
}
