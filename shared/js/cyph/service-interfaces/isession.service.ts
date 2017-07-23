import {BehaviorSubject, Observable} from 'rxjs';
import {ISession} from '../session';
import {ProFeatures} from '../session/profeatures';


/**
 * Manages a session.
 */
export interface ISessionService extends ISession {
	/** API flags passed into this session. */
	readonly apiFlags: {
		forceTURN: boolean;
		modestBranding: boolean;
		nativeCrypto: boolean;
		telehealth: boolean;
	};

	/** App username. Currently just an empty string. */
	readonly appUsername: Observable<string>;

	/** Resolves when this session is connected. */
	readonly connected: Promise<void>;

	/** Local username (e.g. "me"). */
	readonly localUsername: Observable<string>;

	/** @see ProFeatures */
	readonly proFeatures: ProFeatures;

	/** Remote username (e.g. "friend" or "alice"). */
	readonly remoteUsername: BehaviorSubject<string>;

	/** Initializes service. */
	init (channelID: string, userID?: string) : void;
}
