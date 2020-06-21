/**
 * Contains promise and resolve + reject functions.
 */
export interface IResolvable<T> extends Promise<T> {
	/** @see Promise */
	promise: Promise<T>;

	/** Rejects promise. */
	reject: (err?: any) => void;

	/** Resolves promise. */
	resolve: (t?: T | PromiseLike<T>) => void;

	/** Current value. */
	value?: T;
}
