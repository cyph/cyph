/**
 * Message data.
 */
export interface IMessageData {
	/** Author of this message. */
	author?: string;

	/** Unique id for this message. */
	id: string;

	/** Timestamp of this message. */
	timestamp?: number;
}
