import {ITimer} from '../../itimer';
import {ISession} from '../../session/isession';
import {States} from './enums';
import {ICyphertext} from './icyphertext';
import {IFileManager} from './ifilemanager';
import {IP2PManager} from './ip2pmanager';
import {IScrollManager} from './iscrollmanager';


/**
 * This is the entire end-to-end representation of a cyph.
 */
export interface IChat {
	/** Indicates whether authentication has completed (still true even after disconnect). */
	readonly isConnected: boolean;

	/** Indicates whether chat has been disconnected. */
	readonly isDisconnected: boolean;

	/** Indicates whether the other party is typing. */
	readonly isFriendTyping: boolean;

	/** Indicates whether the queued message is self-destructing. */
	readonly queuedMessageSelfDestruct: boolean;

	/** Indicates whether the mobile chat UI is to be displayed. */
	readonly isMobile: boolean;

	/** The current message being composed. */
	currentMessage: string;

	/** Percentage complete with initial handshake (approximate / faked out). */
	readonly keyExchangeProgress: number;

	/** Chat UI state/view. */
	readonly state: States;

	/** Message list. */
	readonly messages: {
		author: string;
		selfDestructTimer: ITimer;
		text: string;
		timestamp: number;
		timeString: string;
		unread: boolean;
	}[];

	/** Cyphertext instance. */
	readonly cyphertext: ICyphertext;

	/** File manager instance. */
	readonly fileManager: IFileManager;

	/** P2P manager instance. */
	readonly p2pManager: IP2PManager;

	/** Scroll manager instance. */
	readonly scrollManager: IScrollManager;

	/** Session instance. */
	readonly session: ISession;

	/**
	 * Aborts the process of chat initialisation and authentication.
	 */
	abortSetup () : void;

	/**
	 * Adds a message to the chat.
	 * @param text
	 * @param author
	 * @param timestamp If not set, will use Util.timestamp().
	 * @param shouldNotify If true, a notification will be sent.
	 * @param selfDestructTimeout
	 */
	addMessage (
		text: string,
		author: string,
		timestamp?: number,
		shouldNotify?: boolean,
		selfDestructTimeout?: number
	) : Promise<void>;

	/**
	 * Begins chat.
	 */
	begin () : Promise<void>;

	/**
	 * Changes chat UI state.
	 * @param state
	 */
	changeState (state: States) : void;

	/**
	 * This kills the chat.
	 */
	close () : void;

	/**
	 * After confirmation dialog, this kills the chat.
	 */
	disconnectButton () : void;

	/**
	 * Displays help information.
	 */
	helpButton () : void;

	/**
	 * Checks for change to current message, and sends appropriate
	 * typing indicator signals through session.
	 */
	messageChange () : void;

	/**
	 * Sends a message.
	 * @param message
	 * @param selfDestructTimeout
	 */
	send (message?: string, selfDestructTimeout?: number) : void;

	/**
	 * Sets this.isConnected to true.
	 */
	setConnected () : void;

	/**
	 * Sets this.isFriendTyping to isFriendTyping.
	 * @param isFriendTyping
	 */
	setFriendTyping (isFriendTyping: boolean) : void;

	/**
	 * Sets queued message to be sent after handshake.
	 * @param messageText
	 * @param selfDestruct
	 */
	setQueuedMessage (
		messageText?: string,
		selfDestruct?: boolean
	) : void;
}
