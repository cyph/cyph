/**
 * Used by ThreadedSession for cross-thread method calls.
 */
export const threadedSessionEvents	= {
	close: 'close-ThreadedSession',
	receive: 'receive-ThreadedSession',
	send: 'send-ThreadedSession',
	sendText: 'sendText-ThreadedSession',
	updateState: 'updateState-ThreadedSession',
	updateStateThread: 'updateStateThread-ThreadedSession'
};
