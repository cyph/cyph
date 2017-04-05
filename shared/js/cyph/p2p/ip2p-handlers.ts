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

	/** Connected handler. */
	connected: (isConnected: boolean) => void;

	/** Request confirm handler. */
	requestConfirm: (callType: 'audio'|'video', isAccepted: boolean) => Promise<boolean>;

	/** Request confirmation handler. */
	requestConfirmation: () => void;

	/** Request rejection handler. */
	requestRejection: () => void;
}
