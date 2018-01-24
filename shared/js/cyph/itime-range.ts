/** Represents a range of times. */
export interface ITimeRange {
	/** End time. */
	end: {hour: number; minute: number};

	/** Start time. */
	start: {hour: number; minute: number};
}
