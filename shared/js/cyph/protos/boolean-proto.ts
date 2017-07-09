/** Boolean encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class BooleanProto {
	/** @inheritDoc */
	public static create () : boolean {
		return false;
	}

	/** @inheritDoc */
	public static decode (bytes: Uint8Array) : boolean {
		return bytes[0] === 1;
	}

	/** @inheritDoc */
	public static encode (data: boolean) : Uint8Array {
		return new Uint8Array([data ? 1 : 0]);
	}

	/** @inheritDoc */
	public static verify () : void {}
}
