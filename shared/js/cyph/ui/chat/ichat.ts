import {ITimer} from '../../itimer';
import {Users} from '../../session/enums';
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
	/** Indicates whether authentication has completed
		(still true even after disconnect). */
	isConnected: boolean;

	/** Indicates whether chat has been disconnected. */
	isDisconnected: boolean;

	/** Indicates whether the other party is typing. */
	isFriendTyping: boolean;

	/** Indicates whether the queued message is self-destructing. */
	queuedMessageSelfDestruct: boolean;

	/** Indicates whether the mobile chat UI is to be displayed. */
	isMobile: boolean;

	/** The current message being composed. */
	currentMessage: string;

	/** Percentage complete with initial handshake
		(approximate / faked out). */
	keyExchangeProgress: number;

	/** Chat UI state/view. */
	state: States;

	/** Message list. */
	messages: {
		author: string;
		selfDestructTimer: ITimer;
		text: string;
		timestamp: number;
		timeString: string;
	}[];

	/** Cyphertext instance. */
	cyphertext: ICyphertext;

	/** File manager instance. */
	fileManager: IFileManager;

	/** P2P manager instance. */
	p2pManager: IP2PManager;

	/** Scroll manager instance. */
	scrollManager: IScrollManager;

	/** Session instance. */
	session: ISession;

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
		author: Users,
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
