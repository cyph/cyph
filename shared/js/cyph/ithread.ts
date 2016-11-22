/**
 * Creates and controls a thread.
 */
export interface IThread {
	/**
	 * Indicates whether this thread is active.
	 */
	isAlive () : boolean;

	/**
	 * Sends a message to this thread.
	 */
	postMessage (o: any) : void;

	/**
	 * This kills the thread.
	 */
	stop () : void;
}
