import {
	CastleIncomingMessages,
	ICastleIncomingMessages as ICastleIncomingMessagesInternal
} from '../../proto';
import {ICastleIncomingMessages} from '../crypto/castle/icastle-incoming-messages';
import {deserialize, serialize} from '../util/serialization';

/** @see CastleIncomingMessages */
export class CastleIncomingMessagesProto {
	/** @see IProto.create */
	public static create () : ICastleIncomingMessages {
		return {max: 0, queue: {}};
	}

	/** @see IProto.decode */
	public static async decode (
		bytes: Uint8Array
	) : Promise<ICastleIncomingMessages> {
		const incomingMessages = await deserialize(
			CastleIncomingMessages,
			bytes
		);

		if (!incomingMessages || !incomingMessages.queue) {
			return CastleIncomingMessagesProto.create();
		}

		const {queue} = incomingMessages;

		return {
			max: incomingMessages.max,
			queue: Object.keys(queue).reduce<{
				[id: number]: Uint8Array[] | undefined;
			}>((o, id: any) => {
				const {cyphertexts} = queue[id];
				o[id] =
					cyphertexts && cyphertexts.length > 0 ?
						cyphertexts :
						undefined;
				return o;
			}, {})
		};
	}

	/** @see IProto.encode */
	public static async encode (
		incomingMessages: ICastleIncomingMessages
	) : Promise<Uint8Array> {
		return serialize<ICastleIncomingMessagesInternal>(
			CastleIncomingMessages,
			{
				max: incomingMessages.max,
				queue: Object.keys(incomingMessages.queue).reduce<{
					[
						id: string
					]: CastleIncomingMessages.ICastleIncomingMessageItem;
				}>((o, id: any) => {
					o[id] = {cyphertexts: incomingMessages.queue[id]};
					return o;
				}, {})
			}
		);
	}

	/** @see IProto.verify */
	public static verify (_DATA: ICastleIncomingMessages) : undefined {
		return;
	}
}
