import {ISessionCapabilities} from '../proto';


/**
 * Establishes mutually shared capabilities between all parties of a session.
 */
export interface ISessionCapabilitiesService {
	/** Mutual capabilities available for this session. */
	readonly capabilities: Promise<ISessionCapabilities>;

	/** Locally supported capabilities. */
	readonly localCapabilities: Promise<ISessionCapabilities>;

	/** Sets localCapabilities.p2p. */
	resolveP2PSupport: (isSupported: boolean) => void;

	/** Sets localCapabilities.walkieTalkieMode. */
	resolveWalkieTalkieMode: (walkieTalkieMode: boolean) => void;
}
