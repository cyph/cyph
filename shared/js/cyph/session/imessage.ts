import {IMessageData} from './imessage-data';


/**
 * Message to be sent over a session, indicating some RPC event.
 */
export interface IMessage {
	/** Associated data (e.g. a user-facing chat message). */
	data: IMessageData;

	/** Event name (e.g. "text"). */
	readonly event?: string;
}
