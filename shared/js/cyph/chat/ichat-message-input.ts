import type {Observable} from 'rxjs';
import type {IChatMessagePredecessor, IChatMessageValue} from '../proto/types';

/**
 * Data needed to add a new chat message.
 */
export interface IChatMessageInput {
	/** Message author. */
	author?: Observable<string>;

	/** @see IChatMessage.hash */
	hash?: Uint8Array;

	/** @see IChatMessage.id */
	id?: string;

	/** @see IChatMessage.key */
	key?: Uint8Array;

	/** @see IChatMessage.predecessors */
	predecessors?: IChatMessagePredecessor[];

	/** @see ISessionText.selfDestructChat */
	selfDestructChat?: boolean;

	/** @see IChatMessage.selfDestructTimeout */
	selfDestructTimeout?: number;

	/** If true, a notification will be sent locally. */
	shouldNotify?: boolean;

	/** @see IChatMessage.timestamp */
	timestamp?: number;

	/** @see IChatMessageValue */
	value?: IChatMessageValue | string;
}
