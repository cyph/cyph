import {BehaviorSubject, Observable} from 'rxjs';
import {IHandshakeState} from '../crypto/castle/ihandshake-state';
import {CastleEvents, ISessionMessageAdditionalData, ProFeatures} from '../session';


/**
 * Encapsulates an end-to-end encrypted communication session.
 * This is the entire non-UI representation of a cyph.
 */
export interface ISessionService {
	/** API flags passed into this session. */
	readonly apiFlags: {
		forceTURN: boolean;
		modestBranding: boolean;
		nativeCrypto: boolean;
		telehealth: boolean;
	};

	/** App username. Currently just an empty string. */
	readonly appUsername: Observable<string>;

	/** Resolves when this session is closed. */
	readonly closed: Promise<void>;

	/** Resolves when this session is connected. */
	readonly connected: Promise<void>;

	/** Local username (e.g. "me"). */
	readonly localUsername: Observable<string>;

	/** @see ProFeatures */
	readonly proFeatures: ProFeatures;

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

	/** @see IHandshakeState */
	handshakeState () : Promise<IHandshakeState>;

	/** Initializes service. */
	init (channelID: string, userID?: string) : void;

	/** @see ChannelService.lock */
	lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T>;

	/**
	 * Remove event listener.
	 * @param event
	 * @param handler
	 */
	off<T> (event: string, handler: (data: T) => void) : void;

	/**
	 * Add event listener.
	 * @param event
	 * @param handler
	 */
	on<T> (event: string, handler: (data: T) => void) : void;

	/**
	 * Returns first occurrence of event.
	 * @param event
	 */
	one<T> (event: string) : Promise<T>;

	/**
	 * Send at least one message through the session.
	 * @param messages
	 */
	send (...messages: [string, ISessionMessageAdditionalData][]) : void;

	/**
	 * Trigger event, passing in optional data.
	 * @param event
	 * @param data
	 */
	trigger (event: string, data?: any) : void;
}
