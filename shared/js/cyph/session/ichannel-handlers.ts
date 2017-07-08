/**
 * Channel handlers.
 */
export interface IChannelHandlers {
	/** Close handler. */
	onClose: () => void;

	/** Connect handler. */
	onConnect: () => void;

	/** Message handler. */
	onMessage: (message: Uint8Array) => void;

	/** Open handler. */
	onOpen: (isAlice: boolean) => void;
}
