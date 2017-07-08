import {sodiumUtil} from 'sodiumutil';
import * as NativeCrypto from './native-crypto';


/**
 * Miscellaneous helper functions for Potassium.
 */
export class PotassiumUtil {
	/** Zeroes out memory. */
	public clearMemory (a: ArrayBufferView) : void {
		sodiumUtil.memzero(this.toBytes(a));
	}

	/** Indicates whether two blocks of memory contain the same data. */
	public compareMemory (a: ArrayBufferView, b: ArrayBufferView) : boolean {
		return a.byteLength === b.byteLength && sodiumUtil.memcmp(
			this.toBytes(a),
			this.toBytes(b)
		);
	}

	/** Concatenates multiple blocks of memory into one. */
	public concatMemory (
		clearOriginals: boolean,
		...arrays: ArrayBufferView[]
	) : Uint8Array {
		const out	= new Uint8Array(arrays.reduce((a, b) => a + b.byteLength, 0));
		let index	= 0;

		for (const a of arrays) {
			const array	= this.toBytes(a);
			out.set(array, index);
			index += array.length;

			if (clearOriginals) {
				this.clearMemory(array);
			}
		}

		return out;
	}

	/** Converts base64 string into binary byte array. */
	public fromBase64 (s: string|ArrayBufferView) : Uint8Array {
		return typeof s === 'string' ?
			sodiumUtil.from_base64(s) :
			this.toBytes(s)
		;
	}

	/** Converts Blob into binary byte array. */
	public async fromBlob (b: Blob) : Promise<Uint8Array> {
		return new Promise<Uint8Array>(resolve => {
			const reader	= new FileReader();
			reader.onload	= () => { resolve(new Uint8Array(reader.result)); };
			reader.readAsArrayBuffer(b);
		});
	}

	/** Converts hex string into binary byte array. */
	public fromHex (s: string|ArrayBufferView) : Uint8Array {
		return typeof s === 'string' ?
			sodiumUtil.from_hex(s) :
			this.toBytes(s)
		;
	}

	/** Converts ASCII/Unicode string into binary byte array. */
	public fromString (s: string|ArrayBufferView) : Uint8Array {
		return typeof s === 'string' ?
			sodiumUtil.from_string(s) :
			this.toBytes(s)
		;
	}

	/** Indicates whether native crypto API is supported in this environment. */
	public async isNativeCryptoSupported () : Promise<boolean> {
		try {
			await NativeCrypto.secretBox.seal(
				this.randomBytes(1),
				this.randomBytes(NativeCrypto.secretBox.nonceBytes),
				this.randomBytes(NativeCrypto.secretBox.keyBytes)
			);
			return true;
		}
		catch (_) {
			return false;
		}
	}

	/** Returns array of n random bytes. */
	public randomBytes (n: number) : Uint8Array {
		const bytes	= new Uint8Array(n);
		crypto.getRandomValues(bytes);
		return bytes;
	}

	/** Converts binary into base64 string. */
	public toBase64 (a: ArrayBufferView|string) : string {
		return typeof a === 'string' ?
			a :
			sodiumUtil.to_base64(this.toBytes(a)).replace(/\s+/g, '')
		;
	}

	/** Normalizes any binary data as standard byte array format. */
	public toBytes (a: ArrayBufferView) : Uint8Array {
		return new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
	}

	/** Converts binary into hex string. */
	public toHex (a: ArrayBufferView|string) : string {
		return typeof a === 'string' ?
			a :
			sodiumUtil.to_hex(this.toBytes(a))
		;
	}

	/** Converts binary into ASCII/Unicode string. */
	public toString (a: ArrayBufferView|string) : string {
		return typeof a === 'string' ?
			a :
			sodiumUtil.to_string(this.toBytes(a))
		;
	}

	constructor () {}
}

/** @see PotassiumUtil */
export const potassiumUtil	= new PotassiumUtil();
