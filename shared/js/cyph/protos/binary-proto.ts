/** Binary (noop) encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class BinaryProto {
	/** @inheritDoc */
	public static create () : Uint8Array {
		return new Uint8Array(0);
	}

	/** @inheritDoc */
	public static decode (bytes: Uint8Array) : Uint8Array {
		return bytes;
	}

	/** @inheritDoc */
	public static encode (data: Uint8Array) : Uint8Array {
		return data;
	}

	/** @inheritDoc */
	public static verify () : void {}
}
