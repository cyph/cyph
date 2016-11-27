/**
 * Represents a countdown timer.
 */
export interface ITimer {
	/** Countdown duration in milliseconds. */
	readonly countdown: number;

	/** Indicates whether timer's countdown has completed. */
	readonly isComplete: boolean;

	/** Human-readable string indicating remaining time. */
	readonly timestamp: string;

	/**
	 * Extends the countdown duration.
	 * @param milliseconds
	 */
	addTime (milliseconds: number) : void;

	/**
	 * Initiates countdown.
	 * @returns Promise that resolves when countdown finishes or is stopped.
	 */
	start () : Promise<void>;

	/** Stops countdown. */
	stop () : void;
}
