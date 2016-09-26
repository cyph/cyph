/**
 * Message to be sent over a session, indicating some RPC event.
 * @interface
 */
export interface IMessage {
	/** Unique id for this message. */
	id: string;

	/** Event name (e.g. "text"). */
	event: string;

	/** Self Destruct Flag */
	selfDestruct?: boolean;

	/** Associated data (e.g. a user-facing chat message). */
	data: any;

}
