/** "Never" encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class NeverProto {
	/** @see IProto.create */
	public static create () : never {
		throw new Error('Cannot create a "never".');
	}

	/** @see IProto.decode */
	public static decode (_BYTES: Uint8Array) : never {
		throw new Error('Cannot decode a "never".');
	}

	/** @see IProto.encode */
	public static encode (x: never) : never {
		return x;
	}

	/** @see IProto.verify */
	public static verify (_DATA: unknown) : undefined {
		return;
	}
}
