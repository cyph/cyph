import {Events, RpcEvents, Users} from '../session/enums';
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

	/** @see Events */
	readonly events: Events;

	/** @see ProFeatures */
	readonly proFeatures: ProFeatures;

	/** @see RpcEvents */
	readonly rpcEvents: RpcEvents;

	/** @see Users */
	readonly users: Users;
}
