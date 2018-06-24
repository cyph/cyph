/**
 * Establishes mutually shared capabilities between all parties of a session.
 */
export interface ISessionCapabilitiesService {
	/** Mutual capabilities available for this session. */
	readonly capabilities: {
		p2p: Promise<boolean>;
		walkieTalkieMode: Promise<boolean>;
	};

	/** Sets localCapabilities.p2p. */
	resolveP2PSupport: (isSupported: boolean) => void;

	/** Sets localCapabilities.walkieTalkieMode. */
	resolveWalkieTalkieMode: (walkieTalkieMode: boolean) => void;
}
