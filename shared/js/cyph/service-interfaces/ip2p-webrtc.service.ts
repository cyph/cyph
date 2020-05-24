import {BehaviorSubject, Observable} from 'rxjs';
import * as SimplePeer from 'simple-peer';
import {IResolvable} from '../iresolvable';
import {IP2PHandlers} from '../p2p/ip2p-handlers';
import {Timer} from '../timer';

/**
 * Manages P2P WebRTC logic.
 */
export interface IP2PWebRTCService {
	/** If true, camera access has been requested for the current call. */
	readonly cameraActivated: BehaviorSubject<boolean>;

	/** Emits on session disconnect. */
	readonly disconnect: Observable<void>;

	/** @see IP2PHandlers */
	readonly handlers: Promise<IP2PHandlers>;

	/** Incoming stream data. */
	readonly incomingStreams: BehaviorSubject<
		{
			activeVideo: boolean;
			constraints: MediaStreamConstraints;
			stream?: MediaStream;
			username?: string;
		}[]
	>;

	/** Usernames of current participants in call. */
	readonly incomingStreamUsernames: Observable<string[]>;

	/** Active incoming video feeds. */
	readonly incomingVideoStreams: Observable<
		{
			activeVideo: boolean;
			constraints: MediaStreamConstraints;
			stream: MediaStream;
			username?: string;
		}[]
	>;

	/** Indicates whether an initial call is pending. */
	readonly initialCallPending: BehaviorSubject<boolean>;

	/** Indicates whether a P2P session currently exists. */
	readonly isActive: BehaviorSubject<boolean>;

	/** Indicates whether session is currently loading. */
	readonly loading: BehaviorSubject<boolean>;

	/** Indicates whether starting local camera/microphone has failed. */
	readonly localMediaError: BehaviorSubject<boolean>;

	/** Outgoing stream data. */
	readonly outgoingStream: BehaviorSubject<{
		constraints: MediaStreamConstraints;
		stream?: MediaStream;
	}>;

	/** Resolves when service is ready. */
	readonly ready: Promise<boolean>;

	/** Records calls. */
	readonly recorder: {
		addStream: (stream: MediaStream) => void;
		getBlob: () => Promise<Blob>;
		pause: () => void;
		resume: () => void;
		start: () => void;
		stop: () => Promise<void>;
	};

	/** If true, screen sharing is allowed during the current call. */
	readonly screenSharingEnabled: BehaviorSubject<boolean>;

	/** If true, toggling video is allowed during the current call. */
	readonly videoEnabled: BehaviorSubject<boolean>;

	/** WebRTC instance. */
	readonly webRTC: BehaviorSubject<
		| undefined
		| {
				peers: {
					connected: Promise<void>;
					peerResolvers:
						| IResolvable<SimplePeer.Instance>[]
						| undefined;
				}[];
				timer: Timer;
		  }
	>;

	/**
	 * Accepts current call request (or preemptively accepts future call requests,
	 * disabling the confirmation dialog).
	 */
	accept (callType?: 'audio' | 'video', isPassive?: boolean) : Promise<void>;

	/** This kills the P2P session. */
	close (incomingP2PKill?: boolean) : Promise<void>;

	/** Gets all available I/O devices. */
	getDevices (
		includeScreens?: boolean
	) : Promise<{
		cameras: {label: string; switchTo: () => Promise<void>}[];
		mics: {label: string; switchTo: () => Promise<void>}[];
		screens: {label: string; switchTo: () => Promise<void>}[];
		speakers: {label: string; switchTo: () => Promise<void>}[];
	}>;

	/** Initializes local I/O stream. */
	initUserMedia (
		callType?: 'audio' | 'video'
	) : Promise<MediaStream | undefined>;

	/** Sets up a new P2P session. */
	join (p2pSessionData: {
		callType: 'audio' | 'video';
		iceServers: string;
		id: string;
	}) : Promise<void>;

	/**
	 * Sends a new call request to the other party.
	 * @param callType Requested session type.
	 */
	request (
		callType: 'audio' | 'video',
		isPassive?: boolean,
		usernames?: string[]
	) : Promise<void>;

	/** Resolves handlers. */
	resolveHandlers (handlers: IP2PHandlers) : void;

	/** Resolves ready. */
	resolveReady () : void;

	/** Resolves remote videos. */
	resolveRemoteVideos (remoteVideos: () => JQuery) : void;

	/**
	 * Pauses all or a subset of the current outgoing stream.
	 * @param medium If specified ("video" or "audio"), will only pause
	 * that subset of the stream. If not specified, the entire stream
	 * will be affected.
	 * @param shouldPause If not specified, will switch to the opposite
	 * of the current state. If set to a new device ID, unpausing is implied.
	 */
	toggle (
		medium?: 'audio' | 'video',
		shouldPause?: boolean | {newDeviceID: string; screenShare?: boolean}
	) : void;
}
