import {ChatUnconfirmedMessages} from '../../proto';
import {util} from '../util';


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
		const {unconfirmedMessages}	= await util.deserialize(ChatUnconfirmedMessages, bytes);

		if (!unconfirmedMessages) {
			return {};
		}

		return unconfirmedMessages;
	}

	/** @see IProto.encode */
	public static async encode (
		data: {[id: string]: boolean|undefined}
	) : Promise<Uint8Array> {
		return util.serialize(
			ChatUnconfirmedMessages,
			{unconfirmedMessages: <{[id: string]: boolean}> data}
		);
	}

	/** @see IProto.verify */
	public static verify () : void {}
}
