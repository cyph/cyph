/**
 * P2P handlers.
 */
export interface IP2PHandlers {
	/** Request accept confirm handler. */
	acceptConfirm: (
		callType: 'audio'|'video',
		timeout: number,
		isAccepted: boolean
	) => Promise<boolean>;

	/** Canceled handler. */
	canceled: () => void|Promise<void>;

	/** Connected handler. */
	connected: (isConnected: boolean) => void|Promise<void>;

	/** Request confirm handler. */
	requestConfirm: (callType: 'audio'|'video', isAccepted: boolean) => Promise<boolean>;

	/** Request confirmation handler. */
	requestConfirmation: () => void|Promise<void>;

	/** Request rejection handler. */
	requestRejection: () => void|Promise<void>;
}
