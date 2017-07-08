/**
 * Channel message.
 */
export interface IChannelMessage {
	/** Cyphertext. */
	cyphertext: Uint8Array;

	/** User who sent the message. */
	sender: string;
}
