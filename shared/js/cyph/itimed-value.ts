/** A value with a timestamp attached. */
export interface ITimedValue<T> {
	/** Timestamp. */
	timestamp: number;

	/** Value. */
	value: T;
}
