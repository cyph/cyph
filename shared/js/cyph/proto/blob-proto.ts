import {potassiumUtil} from '../crypto/potassium/potassium-util';


/** Blob encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class BlobProto {
	/** @see IProto.create */
	public static create () : Blob {
		return new Blob();
	}

	/** @see IProto.decode */
	public static decode (bytes: Uint8Array) : Blob {
		return new Blob([bytes]);
	}

	/** @see IProto.encode */
	public static async encode (data: Blob) : Promise<Uint8Array> {
		return potassiumUtil.fromBlob(data);
	}

	/** @see IProto.verify */
	public static verify () : void {}
}
