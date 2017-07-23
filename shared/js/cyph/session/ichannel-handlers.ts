/**
 * Channel handlers.
 */
export interface IChannelHandlers {
	/** Close handler. */
	onClose: () => Promise<void>;

	/** Connect handler. */
	onConnect: () => Promise<void>;

	/** Message handler. */
	onMessage: (message: Uint8Array) => Promise<void>;

	/** Open handler. */
	onOpen: (isAlice: boolean) => Promise<void>;
}
