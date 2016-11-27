/**
 * Message to be sent over a session, indicating some RPC event.
 */
export interface IMessage {
	/** Unique id for this message. */
	readonly id?: string;

	/** Event name (e.g. "text"). */
	readonly event?: string;

	/** Associated data (e.g. a user-facing chat message). */
	readonly data?: any;
}
