import {Timer} from '../timer';


/**
 * Represents one message in a chat.
 */
export interface IChatMessage {
	/** Message author. */
	author: string;

	/** Timer for self-destruction. */
	selfDestructTimer?: Timer;

	/** Message text. */
	text?: string;

	/** Message timestamp. */
	timestamp: number;

	/** Message timestamp string. */
	timeString: string;

	/** Indicates whether message is unread. */
	unread: boolean;
}
