import {IP2PHandlers} from '../p2p/ip2p-handlers';


/**
 * Manages P2P WebRTC logic.
 */
export interface IP2PWebRTCService {
	/** Description of incoming data. */
	readonly incomingStream: {audio: boolean; video: boolean};

	/** Indicates whether a P2P session currently exists. */
	readonly isActive: boolean;

	/** Indicates whether session is currently loading. */
	readonly loading: boolean;

	/** Description of outgoing data (passed directly into navigator.getUserMedia). */
	readonly outgoingStream: {audio: boolean; video: boolean};

	/**
	 * Accepts current call request (or preemptively accepts future call requests,
	 * disabling the confirmation dialog).
	 */
	accept (callType?: 'audio'|'video') : void;

	/** This kills the P2P session. */
	close () : void;

	/** Initializes service. */
	init (handlers: IP2PHandlers, localVideo: () => JQuery, remoteVideo: () => JQuery) : void;

	/** Sets up a new P2P session. */
	join () : void;

	/**
	 * Sends a new call request to the other party.
	 * @param callType Requested session type.
	 */
	request (callType: 'audio'|'video') : Promise<void>;

	/**
	 * Pauses all or a subset of the current outgoing stream.
	 * @param shouldPause If not specified, will switch to the opposite
	 * of the current state.
	 * @param medium If specified ("video" or "audio"), will only pause
	 * that subset of the stream. If not specified, the entire stream
	 * will be affected.
	 */
	toggle (shouldPause?: boolean, medium?: 'audio'|'video') : void;
}
