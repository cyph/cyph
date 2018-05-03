import {BehaviorSubject} from 'rxjs';
import {IAsyncList} from '../iasync-list';
import {IAsyncMap} from '../iasync-map';
import {IAsyncValue} from '../iasync-value';
import {LocalAsyncList} from '../local-async-list';
import {LockFunction} from '../lock-function-type';
import {IChatLastConfirmedMessage, IChatMessage, IChatMessageValue} from '../proto';
import {States} from './enums';
import {IChatMessageLiveValue} from './ichat-message-live-value';


/**
 * Represents data in a chat.
 */
export interface IChatData {
	/** The current message being composed. */
	currentMessage: IChatMessageLiveValue;

	/** Percentage complete of initial handshake or other loading process. */
	initProgress: BehaviorSubject<number>;

	/** Indicates whether authentication has completed (still true even after disconnect). */
	isConnected: boolean;

	/** Indicates whether chat has been disconnected. */
	isDisconnected: boolean;

	/** Indicates whether the other party is typing. */
	isFriendTyping: BehaviorSubject<boolean>;

	/** Indicates whether the current message changed before the last check. */
	isMessageChanged: boolean;

	/** Last outgoing message whose receipt has been confirmed. */
	lastConfirmedMessage: IAsyncValue<IChatLastConfirmedMessage>;

	/** Message list. */
	messages: IAsyncList<IChatMessage>;

	/** Map of message IDs to values. */
	messageValues: IAsyncMap<string, IChatMessageValue>;

	/** Local message outbox. */
	pendingMessages: LocalAsyncList<IChatMessage&{pending: true}>;

	/** The previous message sent. */
	previousMessage?: string;

	/** Currently queued message for sending post-handshake. */
	queuedMessage?: string;

	/** Lock for handling incoming messages. */
	receiveTextLock: LockFunction;

	/** Chat UI state/view. */
	state: States;

	/** List of unconfirmed outgoing message IDs, based on lastConfirmedMessage. */
	unconfirmedMessages: BehaviorSubject<{[id: string]: boolean|undefined}>;
}
