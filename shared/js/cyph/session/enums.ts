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
	public static abort: string				= 'abort';
	public static beginChat: string			= 'beginChat';
	public static beginChatComplete: string	= 'beginChatComplete';
	public static beginWaiting: string		= 'beginWaiting';
	public static castle: string			= 'castle';
	public static closeChat: string			= 'closeChat';
	public static connect: string			= 'connect';
	public static connectFailure: string	= 'connectFailure';
	public static cyphertext: string		= 'cyphertext';
	public static filesUI: string			= 'filesUI';
	public static newCyph: string			= 'newCyph';
	public static p2pUI: string				= 'p2pUI';
	public static pingPongTimeout: string	= 'pingPongTimeout';
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
	public static cyphId: string			= 'cyphId';
	public static sharedSecret: string		= 'sharedSecret';
	public static isAlive: string			= 'isAlive';
	public static isCreator: string			= 'isCreator';
	public static isStartingNewCyph: string	= 'isStartingNewCyph';
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
export enum Users {
	me,
	friend,
	app
}
