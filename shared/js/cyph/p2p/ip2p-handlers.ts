import {MaybePromise} from '../maybe-promise-type';

/**
 * P2P handlers.
 */
export interface IP2PHandlers {
	/** Request accept confirm handler. */
	acceptConfirm: (
		callType: 'audio' | 'video',
		timeout?: number,
		isAccepted?: boolean
	) => Promise<boolean>;

	/** Indicates whether audio should be enabled by default. */
	audioDefaultEnabled: () => boolean;

	/** Canceled handler. */
	canceled: () => MaybePromise<void>;

	/** Connected handler. */
	connected: (isConnected: boolean) => MaybePromise<void>;

	/** Failed handler. */
	failed: () => MaybePromise<void>;

	/** Loaded handler. */
	loaded: () => MaybePromise<void>;

	/** Local video start confirm handler. */
	localVideoConfirm: (video: boolean) => Promise<boolean>;

	/** Request confirm handler. */
	requestConfirm: (
		callType: 'audio' | 'video',
		isAccepted?: boolean
	) => Promise<boolean>;

	/** Request confirmation handler. */
	requestConfirmation: () => MaybePromise<void>;

	/** Request rejection handler. */
	requestRejection: () => MaybePromise<void>;
}
