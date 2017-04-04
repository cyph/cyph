/**
 * Message data.
 */
export interface IMessageData {
	/** Author of this message. */
	author?: string;

	/** @see Message.id */
	id?: string;

	/** Timestamp of this message. */
	timestamp?: number;
}
