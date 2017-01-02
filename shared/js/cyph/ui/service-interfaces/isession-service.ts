import {Events, RpcEvents, Users} from '../../session/enums';
import {ISession} from '../../session/isession';


/**
 * Manages a session.
 */
export interface ISessionService extends ISession {
	/** API flags passed into this session. */
	readonly apiFlags: {
		forceTURN: boolean,
		modestBranding: boolean,
		nativeCrypto: boolean
	};

	/** @see Events */
	readonly events: Events;

	/** @see RpcEvents */
	readonly rpcEvents: RpcEvents;

	/** @see Users */
	readonly users: Users;
}
