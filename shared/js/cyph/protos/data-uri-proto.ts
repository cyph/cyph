import {potassiumUtil} from '../crypto/potassium/potassium-util';


/** Base64 data URI encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class DataURIProto {
	/** @ignore */
	private static readonly prefix: string	= 'data:application/octet-stream;base64,';

	/** @ignore */
	private static readonly prefixBytes: Uint8Array	= potassiumUtil.fromString(
		DataURIProto.prefix
	);

	/** @inheritDoc */
	public static create () : string {
		return DataURIProto.prefix;
	}

	/** @inheritDoc */
	public static decode (bytes: Uint8Array) : string {
		return potassiumUtil.toString(bytes);
	}

	/** @inheritDoc */
	public static encode (data: string) : Uint8Array {
		return potassiumUtil.fromBase64(data.slice(DataURIProto.prefix.length));
	}

	/** @inheritDoc */
	public static verify (data: string) : string|void {
		if (
			data.length >= DataURIProto.prefix.length &&
			potassiumUtil.compareMemory(
				potassiumUtil.fromString(data.slice(0, DataURIProto.prefix.length)),
				DataURIProto.prefixBytes
			)
		) {
			return;
		}

		return 'Not a data URI.';
	}
}
