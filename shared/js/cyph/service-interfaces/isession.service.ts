import {BehaviorSubject, Observable} from 'rxjs';
import {IHandshakeState} from '../crypto/castle/ihandshake-state';
import {ISessionMessage} from '../proto';
import {
	CastleEvents,
	ISessionMessageAdditionalData,
	ISessionMessageData,
	ProFeatures
} from '../session';


/**
 * Encapsulates an end-to-end encrypted communication session.
 * This is the entire non-UI representation of a cyph.
 */
export interface ISessionService {
	/** API flags passed into this session. */
	readonly apiFlags: {
		disableP2P: boolean;
		modestBranding: boolean;
	};

	/** App username. Currently just an empty string. */
	readonly appUsername: Observable<string>;

	/** Resolves when this session is closed. */
	readonly closed: Promise<void>;

	/** Resolves when this session is connected. */
	readonly connected: Promise<void>;

	/** When true, blocks responding to pings. */
	readonly freezePong: BehaviorSubject<boolean>;

	/** Local username (e.g. "me"). */
	readonly localUsername: Observable<string>;

	/** @see ProFeatures */
	readonly proFeatures: ProFeatures;

	/** Resolves when service is ready. */
	readonly ready: Promise<void>;

	/** Remote username (e.g. "friend" or "alice"). */
	readonly remoteUsername: BehaviorSubject<string>;

	/** State of the cyph (referenced by UI). */
	readonly state: {
		cyphID: string;
		isAlice: boolean;
		isAlive: boolean;
		sharedSecret: string;
		startingNewCyph?: boolean;
		wasInitiatedByAPI: boolean;
	};

	/** Castle event handler called by Castle.Transport. */
	castleHandler (
		event: CastleEvents,
		data?: Uint8Array|{author: Observable<string>; plaintext: Uint8Array; timestamp: number}
	) : Promise<void>;

	/** This kills the cyph. */
	close () : void;

	/** Cleans things up and tears down event handlers. */
	destroy () : void;

	/** @see IHandshakeState */
	handshakeState () : Promise<IHandshakeState>;

	/** Initializes service. */
	init (channelID: string, userID?: string) : void;

	/** @see ChannelService.lock */
	lock<T> (
		f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
		reason?: string
	) : Promise<T>;

	/** Remove event listener. */
	off<T> (event: string, handler?: (data: T) => void) : void;

	/** Add event listener. */
	on<T> (event: string, handler: (data: T) => void) : void;

	/** Returns first occurrence of event. */
	one<T> (event: string) : Promise<T>;

	/** Send at least one message through the session. */
	send (
		...messages: [string, ISessionMessageAdditionalData][]
	) : Promise<(ISessionMessage&{data: ISessionMessageData})[]>;

	/** Variant of send that waits for confirmation. */
	sendAndAwaitConfirmation (
		...messages: [string, ISessionMessageAdditionalData][]
	) : Promise<(ISessionMessage&{data: ISessionMessageData})[]>;

	/** Trigger event, passing in optional data. */
	trigger (event: string, data?: any) : void;

	/** Resolves when other user is online. */
	yt () : Promise<void>;
}
