/**
 * Manages P2P sessions.
 * @interface
 */
export interface IP2P {
	/** Description of incoming data. */
	incomingStream: { audio: boolean; video: boolean; };

	/** Indicates whether a P2P session currently exists. */
	isActive: boolean;

	/** Indicates whether session is currently loading. */
	loading: boolean;

	/** Description of outgoing data (passed directly into navigator.getUserMedia). */
	outgoingStream: { audio: boolean; video: boolean; };

	/**
	 * Accepts current call request (or preemptively accepts future call requests,
	 * disabling the confirmation dialog).
	 */
	accept () : void;

	/**
	 * This kills the P2P session.
	 */
	close () : void;

	/**
	 * Sets up a new P2P session.
	 */
	join () : void;

	/**
	 * Sends a new call request to the other party.
	 * @param callType Requested session type ("video" or "audio").
	 */
	request (callType: string) : void;

	/**
	 * Pauses all or a subset of the current outgoing stream.
	 * @param shouldPause If not specified, will switch to the opposite
	 * of the current state.
	 * @param medium If specified ("video" or "audio"), will only pause
	 * that subset of the stream. If not specified, the entire stream
	 * will be affected.
	 */
	toggle (shouldPause?: boolean, medium?: string) : void;
}
