/** @see CastleIncomingMessages */
export interface ICastleIncomingMessages {
	/** @see CastleIncomingMessages.max */
	max: number;

	/** @see CastleIncomingMessages.queue */
	queue: {[id: number]: Uint8Array[] | undefined};
}
