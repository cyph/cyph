import type {IResolvable} from '../../iresolvable';

/**
 * Represents a pairwise (one-to-one) Castle session.
 */
export interface IPairwiseSession {
	/** Resolves when ready to process new messages. */
	readonly ready: IResolvable<void>;

	/** Receive/decrypt incoming message. */
	receive (cyphertext: Uint8Array, initial: boolean) : Promise<void>;

	/** Send/encrypt outgoing message. */
	send (
		plaintext: string | ArrayBufferView,
		timestamp: number
	) : Promise<void>;
}
