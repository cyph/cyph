/**
 * Contains promise and resolve + reject functions.
 */
export interface IResolvable<T> extends Promise<T> {
	/** @see Promise */
	readonly promise: Promise<T>;

	/** Indicates whether or not this promise has been rejected or resolved. */
	complete: boolean;

	/** Rejects promise. */
	reject: (err?: any) => void;

	/** Indicates whether or not this promise has been rejected. */
	rejected: boolean;

	/** Resolves promise. */
	resolve: (t?: T | PromiseLike<T>) => void;

	/** Indicates whether or not this promise has been resolved. */
	resolved: boolean;

	/** Current value. */
	value?: T;
}
