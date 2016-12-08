/**
 * Used by ThreadedSession for cross-thread method calls.
 */
export class ThreadedSessionEvents {
	/** @see ThreadedSessionEvents */
	public readonly close: string				= 'close-ThreadedSession';

	/** @see ThreadedSessionEvents */
	public readonly receive: string				= 'receive-ThreadedSession';

	/** @see ThreadedSessionEvents */
	public readonly send: string				= 'send-ThreadedSession';

	/** @see ThreadedSessionEvents */
	public readonly sendText: string			= 'sendText-ThreadedSession';

	/** @see ThreadedSessionEvents */
	public readonly updateState: string			= 'updateState-ThreadedSession';

	/** @see ThreadedSessionEvents */
	public readonly updateStateThread: string	= 'updateStateThread-ThreadedSession';

	constructor () {}
}

/** @see ThreadedSessionEvents */
export const threadedSessionEvents	= new ThreadedSessionEvents();
