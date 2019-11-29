import {IResolvable} from '../../iresolvable';

/**
 * Represents a pairwise (one-to-one) Castle session.
 */
export interface IPairwiseSession {
	/** Resolves when first chunk of incoming messages have been processed. */
	readonly initialMessagesProcessed: IResolvable<void>;

	/** Receive/decrypt incoming message. */
	receive (cyphertext: Uint8Array, initial: boolean) : Promise<void>;

	/** Send/encrypt outgoing message. */
	send (
		plaintext: string | ArrayBufferView,
		timestamp: number
	) : Promise<void>;
}
