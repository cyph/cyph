/** Number encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class NumberProto {
	/** @inheritDoc */
	public static create () : number {
		return 0;
	}

	/** @inheritDoc */
	public static decode (bytes: Uint8Array) : number {
		return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat64(0, true);
	}

	/** @inheritDoc */
	public static encode (data: number) : Uint8Array {
		return new Uint8Array(new Float64Array([data]).buffer);
	}

	/** @inheritDoc */
	public static verify () : void {}
}
