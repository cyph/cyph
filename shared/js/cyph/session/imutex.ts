module Cyph {
	export module Session {
		/**
		 * Distributed lock between session parties.
		 * @interface
		 */
		export interface IMutex {
			/**
			 * Attempt to claim lock, then run f once ownership is acquired.
			 * @param f
			 * @param purpose Allows the owner to communicate to the
			 * other party what the lock is being used for.
			 */
			lock (f: Function, purpose?: string) : void;

			/**
			 * Release lock.
			 */
			unlock () : void;
		}
	}
}
