import {CastleIncomingMessages} from '../../proto';
import {deserialize, serialize} from '../util/serialization';


/** @see CastleIncomingMessages */
export class CastleIncomingMessagesProto {
	/** @see IProto.create */
	public static create () : {[id: number]: Uint8Array[]|undefined} {
		return {};
	}

	/** @see IProto.decode */
	public static async decode (bytes: Uint8Array) : Promise<{
		[id: number]: Uint8Array[]|undefined;
	}> {
		const {incomingMessages}	= await deserialize(CastleIncomingMessages, bytes);

		if (!incomingMessages) {
			return {};
		}

		return Object.keys(incomingMessages).reduce<{[id: number]: Uint8Array[]|undefined}>(
			(o, id: any) => {
				const {cyphertexts}	= incomingMessages[id];
				o[id]	= cyphertexts && cyphertexts.length > 0 ? cyphertexts : undefined;
				return o;
			},
			{}
		);
	}

	/** @see IProto.encode */
	public static async encode (
		data: {[id: number]: Uint8Array[]|undefined}
	) : Promise<Uint8Array> {
		return serialize(
			CastleIncomingMessages,
			{
				incomingMessages: Object.keys(data).reduce<{
					[id: string]: CastleIncomingMessages.ICastleIncomingMessageItem;
				}>(
					(o, id: any) => {
						o[id]	= {cyphertexts: data[id]};
						return o;
					},
					{}
				)
			}
		);
	}

	/** @see IProto.verify */
	public static verify () : void {}
}
