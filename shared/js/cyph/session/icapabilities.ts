/**
 * A set of supported capabilities.
 */
export interface ICapabilities {
	/** Native crypto / SubtleCrypto. */
	nativeCrypto: boolean;

	/** P2P networking / WebRTC. */
	p2p: boolean;
}
