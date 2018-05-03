import {Observable} from 'rxjs';
import {IP2PHandlers} from '../p2p/ip2p-handlers';
import {ChatService} from '../services/chat.service';


/**
 * Manages P2P WebRTC logic.
 */
export interface IP2PWebRTCService {
	/** Emits on session disconnect. */
	readonly disconnect: Observable<void>;

	/** Description of incoming data. */
	readonly incomingStream: {audio: boolean; video: boolean};

	/** Indicates whether an initial call is pending. */
	readonly initialCallPending: boolean;

	/** Indicates whether a P2P session currently exists. */
	readonly isActive: boolean;

	/** Indicates whether session is currently loading. */
	readonly loading: boolean;

	/** Indicates whether starting local camera/microphone has failed. */
	readonly localMediaError: boolean;

	/** Description of outgoing data (passed directly into navigator.getUserMedia). */
	readonly outgoingStream: {audio: boolean; video: boolean};

	/** Resolves when service is ready. */
	readonly ready: Promise<boolean>;

	/** If true, toggling video is allowed during the current call. */
	readonly videoEnabled: boolean;

	/**
	 * Accepts current call request (or preemptively accepts future call requests,
	 * disabling the confirmation dialog).
	 */
	accept (callType?: 'audio'|'video', isPassive?: boolean) : void;

	/** This kills the P2P session. */
	close () : Promise<void>;

	/** Initializes service. */
	init (
		chatService: ChatService,
		handlers: IP2PHandlers,
		localVideo: () => JQuery,
		remoteVideo: () => JQuery
	) : void;

	/** Sets up a new P2P session. */
	join () : void;

	/**
	 * Sends a new call request to the other party.
	 * @param callType Requested session type.
	 */
	request (callType: 'audio'|'video', isPassive?: boolean) : Promise<void>;

	/** Resolves ready. */
	resolveReady () : void;

	/**
	 * Pauses all or a subset of the current outgoing stream.
	 * @param medium If specified ("video" or "audio"), will only pause
	 * that subset of the stream. If not specified, the entire stream
	 * will be affected.
	 * @param shouldPause If not specified, will switch to the opposite
	 * of the current state.
	 */
	toggle (medium?: 'audio'|'video', shouldPause?: boolean) : void;
}
