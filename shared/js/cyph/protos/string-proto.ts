import {potassiumUtil} from '../crypto/potassium/potassium-util';


/** String encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class StringProto {
	/** @inheritDoc */
	public static create () : string {
		return '';
	}

	/** @inheritDoc */
	public static decode (bytes: Uint8Array) : string {
		return potassiumUtil.toString(bytes);
	}

	/** @inheritDoc */
	public static encode (data: string) : Uint8Array {
		return potassiumUtil.fromString(data);
	}

	/** @inheritDoc */
	public static verify () : void {}
}
