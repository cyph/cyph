/**
 * Represents an asynchronous value.
 */
export interface IAsyncValue<T> {
	/** Gets value. */
	getValue () : Promise<T>;

	/** Sets value. */
	setValue (value: T) : Promise<void>;
}
