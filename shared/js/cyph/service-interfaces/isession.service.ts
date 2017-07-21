import {PotassiumService} from '../services/crypto/potassium.service';
import {ISession} from '../session/isession';
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

	/** Resolves when this session is connected. */
	readonly connected: Promise<void>;

	/** @see ProFeatures */
	readonly proFeatures: ProFeatures;

	/** Remote username (e.g. "friend" or "alice"). */
	readonly remoteUsername: Promise<string>;

	/** Sets remote username. */
	setRemoteUsername: (remoteUsername: string) => void;

	/** Initializes service. */
	init (potassiumService: PotassiumService, channelID: string, userID?: string) : void;
}
