/** Binary (noop) encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class BinaryProto {
	/** @see IProto.create */
	public static create () : Uint8Array {
		return new Uint8Array(0);
	}

	/** @see IProto.decode */
	public static decode (bytes: Uint8Array) : Uint8Array {
		return bytes;
	}

	/** @see IProto.encode */
	public static encode (data: Uint8Array) : Uint8Array {
		return data;
	}

	/** @see IProto.verify */
	public static verify () : void {}
}
