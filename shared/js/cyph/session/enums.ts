import {Strings} from '../strings';


/**
 * Castle-specific events (handled within Session).
 */
export enum CastleEvents {
	abort,
	connect,
	receive,
	send
}

/**
 * Session-related events that may be handled throughout the codes.
 */
export class Events {
	/** @see Events */
	public static abort: string				= 'abort';

	/** @see Events */
	public static beginChat: string			= 'beginChat';

	/** @see Events */
	public static beginChatComplete: string	= 'beginChatComplete';

	/** @see Events */
	public static beginWaiting: string		= 'beginWaiting';

	/** @see Events */
	public static castle: string			= 'castle';

	/** @see Events */
	public static closeChat: string			= 'closeChat';

	/** @see Events */
	public static connect: string			= 'connect';

	/** @see Events */
	public static connectFailure: string	= 'connectFailure';

	/** @see Events */
	public static cyphertext: string		= 'cyphertext';

	/** @see Events */
	public static filesUI: string			= 'filesUI';

	/** @see Events */
	public static newCyph: string			= 'newCyph';

	/** @see Events */
	public static p2pUI: string				= 'p2pUI';
}

/**
 * Subset of events allowed to be remotely triggered by other parties.
 */
export const RPCEvents	= {
	files: 'files',
	mutex: 'mutex',
	p2p: 'p2p',
	text: 'text',
	typing: 'typing'
};

/**
 * Session state value keys.
 */
export class State {
	/** @see State */
	public static cyphId: string			= 'cyphId';

	/** @see State */
	public static sharedSecret: string		= 'sharedSecret';

	/** @see State */
	public static isAlive: string			= 'isAlive';

	/** @see State */
	public static isAlice: string			= 'isAlice';

	/** @see State */
	public static isStartingNewCyph: string	= 'isStartingNewCyph';

	/** @see State */
	public static wasInitiatedByAPI: string	= 'wasInitiatedByAPI';
}

/**
 * Used by ThreadedSession for cross-thread method calls.
 */
export const ThreadedSessionEvents	= {
	close: 'close-ThreadedSession',
	receive: 'receive-ThreadedSession',
	send: 'send-ThreadedSession',
	sendText: 'sendText-ThreadedSession',
	updateState: 'updateState-ThreadedSession',
	updateStateThread: 'updateStateThread-ThreadedSession'
};

/**
 * Representations of users in a session.
 */
export class Users {
	/** @see Users */
	public static app: string	= 'app';

	/** @see Users */
	public static me: string	= Strings.me;

	/** @see Users */
	public static other: string	= 'other';
}
