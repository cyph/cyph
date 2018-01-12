import {MaybePromise} from '../maybe-promise-type';


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
	canceled: () => MaybePromise<void>;

	/** Connected handler. */
	connected: (isConnected: boolean) => MaybePromise<void>;

	/** Request confirm handler. */
	requestConfirm: (callType: 'audio'|'video', isAccepted: boolean) => Promise<boolean>;

	/** Request confirmation handler. */
	requestConfirmation: () => MaybePromise<void>;

	/** Request rejection handler. */
	requestRejection: () => MaybePromise<void>;
}
