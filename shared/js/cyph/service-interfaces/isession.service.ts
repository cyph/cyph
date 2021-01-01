import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {UserLike} from '../account';
import {IHandshakeState} from '../crypto/castle/ihandshake-state';
import {IResolvable} from '../iresolvable';
import {MaybePromise} from '../maybe-promise-type';
import {
	ISessionMessage,
	ISessionMessageData as ISessionMessageDataInternal
} from '../proto/types';
import {CastleService} from '../services/crypto/castle.service';
import {SessionInitService} from '../services/session-init.service';
import {
	CastleEvents,
	ISessionMessageAdditionalData,
	ISessionMessageData,
	ProFeatures,
	RpcEvents
} from '../session';
import {IP2PWebRTCService} from './ip2p-webrtc.service';

/**
 * Encapsulates an end-to-end encrypted communication session.
 * This is the entire non-UI representation of a cyph.
 */
export interface ISessionService {
	/** Resolves when service is aborted. */
	readonly aborted: IResolvable<true>;

	/** API flags passed into this session. */
	readonly apiFlags: {
		disableP2P: boolean;
		modestBranding: boolean;
	};

	/** App username. Currently just an empty string. */
	readonly appUsername: Observable<string>;

	/** Resolves chat init can begin. */
	readonly beginChat: IResolvable<true>;

	/** Resolves chat init is complete. */
	readonly beginChatComplete: IResolvable<true>;

	/** Resolves when we can begin waiting for Bob. */
	readonly beginWaiting: IResolvable<true>;

	/** Resolves when this session's channel is connected. */
	readonly channelConnected: IResolvable<true>;

	/** Target username of outgoing Burner chat request, if applicable. */
	readonly chatRequestUsername: BehaviorSubject<string | undefined>;

	/**
	 * Resolves when this session's channel is connected,
	 * as well as any child channels if applicable.
	 */
	readonly childChannelsConnected: IResolvable<true>;

	/** Resolves when this session is closed. */
	readonly closed: IResolvable<true>;

	/** Resolves when this session is connected. */
	readonly connected: IResolvable<true>;

	/** Resolves when this session's connection fails. */
	readonly connectFailure: IResolvable<true>;

	/** Returns session ID, if only one is set; otherwise returns empty string. */
	readonly cyphID: string;

	/** Resolves when this session 404s. */
	readonly cyphNotFound: IResolvable<true>;

	/** Emits cyphertext versions of all messages (if applicable). */
	readonly cyphertext: Subject<{
		author: Observable<string>;
		cyphertext: Uint8Array;
	}>;

	/** When true, blocks responding to pings. */
	readonly freezePong: BehaviorSubject<boolean>;

	/** Messaging group, if applicable. */
	group?: ISessionService[];

	/** Resolves when first batch of incoming messages have been processed. */
	readonly initialMessagesProcessed: IResolvable<true>;

	/** Another session service that this one internally delegates to. */
	internalSessionService?: ISessionService;

	/** Resolves when confirmed to join session. */
	readonly joinConfirmation: IResolvable<true>;

	/** Indicates whether we're waiting for confirmation to join session. */
	readonly joinConfirmationWait: BehaviorSubject<boolean>;

	/** Local username (e.g. "me"). */
	readonly localUsername: Observable<string>;

	/** Resolves when channel is open. */
	readonly opened: IResolvable<true>;

	/** @see IP2PWebRTCService */
	readonly p2pWebRTCService: IResolvable<IP2PWebRTCService>;

	/** Identifying data about the two parties in the session, if applicable. */
	pairwiseSessionData?: {
		localUsername?: string;
		remoteUsername?: string;
	};

	/** Error message of last prepareForCallType invocation, if applicable. */
	readonly prepareForCallTypeError: BehaviorSubject<string | undefined>;

	/** @see ProFeatures */
	readonly proFeatures: ProFeatures;

	/** Resolves when service is ready. */
	readonly ready: IResolvable<true>;

	/** Remote user, if applicable. */
	readonly remoteUser: IResolvable<UserLike | undefined>;

	/** Remote username (e.g. "friend" or "alice"). */
	readonly remoteUsername: BehaviorSubject<string>;

	/** Returns session shared secret, if only one is set. */
	readonly sharedSecret: string | undefined;

	/** State of the cyph (referenced by UI). */
	readonly state: {
		cyphIDs: BehaviorSubject<string[]>;
		ephemeralStateInitialized: BehaviorSubject<boolean>;
		isAlice: BehaviorSubject<boolean>;
		isAlive: BehaviorSubject<boolean>;
		isConnected: BehaviorSubject<boolean>;
		sharedSecrets: BehaviorSubject<string[]>;
		startingNewCyph: BehaviorSubject<boolean | undefined>;
		wasInitiatedByAPI: BehaviorSubject<boolean>;
	};

	/** Session key for misc stuff like locking. */
	readonly symmetricKey: BehaviorSubject<Uint8Array | undefined>;

	/** Castle event handler called by Castle.Transport. */
	castleHandler (
		event: CastleEvents,
		data?:
			| Uint8Array
			| {
					author: Observable<string>;
					initial: boolean;
					instanceID: string;
					plaintext: Uint8Array;
					timestamp: number;
			  }
	) : Promise<void>;

	/** This kills the cyph. */
	close () : void;

	/** Cleans things up and tears down event handlers. */
	destroy () : void;

	/** @see IHandshakeState */
	handshakeState () : Promise<IHandshakeState>;

	/** Initializes service. */
	init (channelID: string, channelSubID?: string, userID?: string) : void;

	/** @see ChannelService.lock */
	lock<T> (
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<T>,
		reason?: string
	) : Promise<T>;

	/** Remove event listener. */
	off (
		event: RpcEvents,
		handler?: (data: ISessionMessageData[]) => void
	) : void;

	/** Add event listener. */
	on (
		event: RpcEvents,
		handler: (data: ISessionMessageData[]) => void
	) : void;

	/** Returns first occurrence of event. */
	one (event: RpcEvents) : Promise<ISessionMessageData[]>;

	/** If applicable, requests necessary I/O permissions. */
	prepareForCallType (
		callType?: 'audio' | 'video' | undefined
	) : Promise<void>;

	/** Converts an ISessionMessageDataInternal into an ISessionMessageData. */
	processMessageData (
		data: ISessionMessageDataInternal,
		initial?: boolean
	) : Promise<ISessionMessageData>;

	/** Send at least one message through the session. */
	send (
		...messages: [
			string,

			(
				| ISessionMessageAdditionalData
				| ((
						timestamp: number
				  ) => MaybePromise<ISessionMessageAdditionalData>)
			)
		][]
	) : Promise<{
		confirmPromise: Promise<void>;
		newMessages: (ISessionMessage & {data: ISessionMessageData})[];
	}>;

	/** Creates and returns a new instance. */
	spawn (
		sessionInitService?: SessionInitService,
		castleService?: CastleService
	) : ISessionService;
}
