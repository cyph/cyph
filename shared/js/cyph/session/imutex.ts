/**
 * Distributed lock between session parties.
 */
export interface IMutex {
	/**
	 * Sleep until lock is acquired.
	 * @param purpose Data communicated to the other party on what the lock was used for.
	 * @returns Details about the lock.
	 */
	lock (purpose?: string) : Promise<{
		friendLockpurpose: string;
		wasFirst: boolean;
		wasFirstOfType: boolean;
	}>;

	/** Release lock. */
	unlock () : void;
}
