/**
 * Creates and controls a thread.
 */
export interface IThread<T> {
	/** API to interact with thread. */
	readonly api: Promise<T>;

	/**
	 * Indicates whether this thread is active.
	 */
	isAlive (): boolean;

	/**
	 * Sends a message to this thread.
	 */
	postMessage (o: any): void;

	/**
	 * This kills the thread.
	 */
	stop (): void;
}
