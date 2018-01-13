/** Possibly-undefined binary encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class MaybeBinaryProto {
	/** @see IProto.create */
	public static create () : Uint8Array|undefined {
		return undefined;
	}

	/** @see IProto.decode */
	public static decode (bytes: Uint8Array) : Uint8Array|undefined {
		return bytes.length === 0 ? undefined : bytes;
	}

	/** @see IProto.encode */
	public static encode (data?: Uint8Array) : Uint8Array {
		return data === undefined ? new Uint8Array(0) : data;
	}

	/** @see IProto.verify */
	public static verify () : void {}
}
