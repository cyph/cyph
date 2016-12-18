import {ITimer} from '../../itimer';


/**
 * Represents one message in a chat.
 */
export interface IChatMessage {
	/** Message author. */
	author: string;

	/** Timer for self-destruction. */
	selfDestructTimer?: ITimer;

	/** Message text. */
	text: string|undefined;

	/** Message timestamp. */
	timestamp: number;

	/** Message timestamp string. */
	timeString: string;

	/** Indicates whether message is unread. */
	unread: boolean;
}
