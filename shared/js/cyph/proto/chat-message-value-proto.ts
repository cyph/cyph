import * as msgpack from 'msgpack-lite';
import {ChatMessageValue} from '../../proto';
import {IChatMessageValue} from '../chat';
import {deserialize, serialize} from '../util/serialization';


/** @see ChatMessageValue */
export class ChatMessageValueProto {
	/** @see IProto.create */
	public static create () : IChatMessageValue {
		return {};
	}

	/** @see IProto.decode */
	public static async decode (bytes: Uint8Array) : Promise<IChatMessageValue> {
		const data: IChatMessageValue	= await deserialize(ChatMessageValue, bytes);

		if (data.quillDeltaBytes) {
			data.quillDelta	= msgpack.decode(data.quillDeltaBytes);
		}

		return data;
	}

	/** @see IProto.encode */
	public static async encode (data: IChatMessageValue) : Promise<Uint8Array> {
		return serialize(ChatMessageValue, {
			form: data.form,
			quillDeltaBytes: data.quillDeltaBytes,
			text: data.text
		});
	}

	/** @see IProto.verify */
	public static verify () : void {}
}
