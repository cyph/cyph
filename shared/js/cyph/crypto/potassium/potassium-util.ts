import {sodiumUtil} from 'sodiumutil';


/**
 * Miscellaneous helper functions for Potassium.
 */
export class PotassiumUtil {
	/** Splits byte array into chunks. */
	public chunkBytes (a: ArrayBufferView, chunkSize?: number) : Uint8Array[] {
		const bytes	= this.toBytes(a);

		if (chunkSize === undefined || isNaN(chunkSize) || chunkSize < 1) {
			return [bytes];
		}

		const chunks: Uint8Array[]	= [];

		for (let i = 0 ; i < bytes.length ; i += chunkSize) {
			chunks.push(this.toBytes(
				bytes,
				i,
				(bytes.length - i) > chunkSize ?
					chunkSize :
					undefined
			));
		}

		return chunks;
	}

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
			out.set(this.toBytes(a), index);
			index += a.byteLength;

			if (clearOriginals) {
				this.clearMemory(a);
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

	/** Joins byte arrays for later separation with splitBytes. */
	public joinBytes (...chunks: Uint8Array[]) : Uint8Array {
		return this.concatMemory(
			true,
			...chunks.
				map(chunk => [new Uint32Array([chunk.length]), chunk]).
				reduce((a, b) => a.concat(b), [])
		);
	}

	/** Returns array of n random bytes. */
	public randomBytes (n: number) : Uint8Array {
		return typeof (<any> crypto).randomBytes === 'function' ?
			(<any> crypto).randomBytes(n) :
			/* tslint:disable-next-line:ban */
			crypto.getRandomValues(new Uint8Array(n))
		;
	}

	/** Splits chunks that have been joined with joinBytes. */
	public splitBytes (bytes: Uint8Array) : Uint8Array[] {
		const chunks: Uint8Array[]	= [];
		const cyphertextView		= this.toDataView(bytes);

		let i	= 0;
		while (i < bytes.length) {
			const chunkSize	= cyphertextView.getUint32(i, true);
			i += 4;
			chunks.push(this.toBytes(bytes, i, chunkSize));
			i += chunkSize;
		}

		return chunks;
	}

	/** Converts binary into base64 string. */
	public toBase64 (a: ArrayBufferView|string) : string {
		return typeof a === 'string' ?
			a :
			sodiumUtil.to_base64(this.toBytes(a)).replace(/\s+/g, '')
		;
	}

	/** Normalizes any binary data as standard byte array format. */
	public toBytes (a: ArrayBufferView, offset: number = 0, length?: number) : Uint8Array {
		return new Uint8Array(
			a.buffer,
			a.byteOffset + offset,
			length !== undefined ? length : a.byteLength - offset
		);
	}

	/** Converts binary data into DataView. */
	public toDataView (a: ArrayBufferView, offset: number = 0, length?: number) : DataView {
		return new DataView(
			a.buffer,
			a.byteOffset + offset,
			length !== undefined ? length : a.byteLength - offset
		);
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
