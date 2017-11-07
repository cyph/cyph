import {ChatUnconfirmedMessages} from '../../proto';
import {deserialize, serialize} from '../util';


/** @see ChatUnconfirmedMessages */
export class ChatUnconfirmedMessagesProto {
	/** @see IProto.create */
	public static create () : {[id: string]: boolean|undefined} {
		return {};
	}

	/** @see IProto.decode */
	public static async decode (bytes: Uint8Array) : Promise<{
		[id: string]: boolean|undefined;
	}> {
		const {unconfirmedMessages}	= await deserialize(ChatUnconfirmedMessages, bytes);

		if (!unconfirmedMessages) {
			return {};
		}

		return unconfirmedMessages;
	}

	/** @see IProto.encode */
	public static async encode (
		data: {[id: string]: boolean|undefined}
	) : Promise<Uint8Array> {
		return serialize(
			ChatUnconfirmedMessages,
			{unconfirmedMessages: <{[id: string]: boolean}> data}
		);
	}

	/** @see IProto.verify */
	public static verify () : void {}
}
