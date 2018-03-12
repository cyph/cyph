/**
 * Contains promise and resolve + reject functions.
 */
export interface IResolvable<T> {
	/** @see Promise */
	promise: Promise<T>;

	/** Rejects promise. */
	reject: (err?: any) => void;

	/** Resolves promise. */
	resolve: (t?: T|PromiseLike<T>) => void;
}
