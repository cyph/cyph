import {ISession} from './isession';


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
}
